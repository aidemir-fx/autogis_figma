package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type GeocodingHandler struct {
	apiKey string
	client *http.Client
}

func NewGeocodingHandler(apiKey string) *GeocodingHandler {
	return &GeocodingHandler{
		apiKey: strings.TrimSpace(apiKey),
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

type yandexGeocodingResponse struct {
	Response struct {
		GeoObjectCollection struct {
			FeatureMember []struct {
				GeoObject struct {
					Name             string `json:"name"`
					MetaDataProperty struct {
						GeocoderMetaData struct {
							Text    string `json:"text"`
							Address struct {
								Formatted string `json:"formatted"`
							} `json:"Address"`
						} `json:"GeocoderMetaData"`
					} `json:"metaDataProperty"`
				} `json:"GeoObject"`
			} `json:"featureMember"`
		} `json:"GeoObjectCollection"`
	} `json:"response"`
}

func (h *GeocodingHandler) Reverse(c *gin.Context) {
	if h.apiKey == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "geocoding is not configured"})
		return
	}

	lat, err := strconv.ParseFloat(c.Query("lat"), 64)
	if err != nil || lat < -90 || lat > 90 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid latitude"})
		return
	}
	lng, err := strconv.ParseFloat(c.Query("lng"), 64)
	if err != nil || lng < -180 || lng > 180 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid longitude"})
		return
	}

	params := url.Values{}
	params.Set("apikey", h.apiKey)
	params.Set("geocode", fmt.Sprintf("%.7f,%.7f", lng, lat))
	params.Set("format", "json")
	params.Set("lang", "ru_RU")
	params.Set("results", "1")

	req, err := http.NewRequestWithContext(
		c.Request.Context(),
		http.MethodGet,
		"https://geocode-maps.yandex.ru/1.x/?"+params.Encode(),
		nil,
	)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to create geocoding request"})
		return
	}

	resp, err := h.client.Do(req)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "geocoding provider unavailable"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		c.JSON(http.StatusBadGateway, gin.H{"error": "geocoding provider returned an error"})
		return
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to read geocoding response"})
		return
	}

	var payload yandexGeocodingResponse
	if err := json.Unmarshal(body, &payload); err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "invalid geocoding response"})
		return
	}

	if len(payload.Response.GeoObjectCollection.FeatureMember) == 0 {
		c.JSON(http.StatusOK, gin.H{"address": ""})
		return
	}

	geoObject := payload.Response.GeoObjectCollection.FeatureMember[0].GeoObject
	address := strings.TrimSpace(geoObject.MetaDataProperty.GeocoderMetaData.Text)
	if address == "" {
		address = strings.TrimSpace(geoObject.MetaDataProperty.GeocoderMetaData.Address.Formatted)
	}
	if address == "" {
		address = strings.TrimSpace(geoObject.Name)
	}

	c.JSON(http.StatusOK, gin.H{"address": address})
}
