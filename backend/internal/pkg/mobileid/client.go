package mobileid

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

const (
	tokenURL = "https://api.mts.ru/token"
	baseURL  = "https://api.mts.ru/Id-Kyc-MobileIdAdapter-Prod/1.0"
	sessions = "/api/v1/mobile-id-adapter/authentications"
)

type State struct {
	AuthenticationID string     `json:"authenticationId"`
	Status           string     `json:"status"`
	ExpiresAt        *time.Time `json:"expiresAt"`
	SMSCodeExpiresAt *time.Time `json:"smsCodeExpiresAt"`
	SubID            string     `json:"subId"`
	ErrorCode        string     `json:"errorCode"`
}

type Client struct {
	clientID, secret string
	http             *http.Client
	mu               sync.Mutex
	token            string
	validUntil       time.Time
}

func New(clientID, secret string) *Client {
	return &Client{
		clientID: clientID, secret: secret,
		http: &http.Client{
			Timeout:       8 * time.Second,
			CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse },
		},
	}
}

func (c *Client) accessToken(ctx context.Context) (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.token != "" && time.Now().Before(c.validUntil) {
		return c.token, nil
	}
	form := url.Values{"grant_type": {"client_credentials"}}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, tokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	req.SetBasicAuth(c.clientID, c.secret)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	var token struct {
		Value   string `json:"access_token"`
		Expires int    `json:"expires_in"`
	}
	if err := c.do(req, &token); err != nil {
		return "", err
	}
	if token.Value == "" {
		return "", fmt.Errorf("Mobile ID returned an empty access token")
	}
	c.token = token.Value
	c.validUntil = time.Now().Add(time.Duration(token.Expires-30) * time.Second)
	return token.Value, nil
}

func (c *Client) do(req *http.Request, result any) error {
	res, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("Mobile ID request failed: %w", err)
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode > 299 {
		return fmt.Errorf("Mobile ID returned status %d", res.StatusCode)
	}
	if result == nil {
		return nil
	}
	if err := json.NewDecoder(io.LimitReader(res.Body, 64<<10)).Decode(result); err != nil {
		return fmt.Errorf("invalid Mobile ID response: %w", err)
	}
	return nil
}

func (c *Client) request(ctx context.Context, method, path string, payload any, result any) error {
	token, err := c.accessToken(ctx)
	if err != nil {
		return err
	}
	var body []byte
	if payload != nil {
		body, err = json.Marshal(payload)
		if err != nil {
			return err
		}
	}
	req, err := http.NewRequestWithContext(ctx, method, baseURL+path, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	return c.do(req, result)
}

func (c *Client) Start(ctx context.Context, phone, externalID string) (State, error) {
	var result State
	err := c.request(ctx, http.MethodPost, sessions, map[string]string{"phoneNumber": phone, "externalId": externalID}, &result)
	return result, err
}

func (c *Client) Status(ctx context.Context, id string) (State, error) {
	var result State
	err := c.request(ctx, http.MethodGet, sessions+"/"+url.PathEscape(id), nil, &result)
	return result, err
}

func (c *Client) Code(ctx context.Context, id, code string) error {
	return c.request(ctx, http.MethodPost, sessions+"/"+url.PathEscape(id)+"/sms-code", map[string]string{"code": code}, nil)
}
