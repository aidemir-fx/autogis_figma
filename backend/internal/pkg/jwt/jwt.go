package jwt

import (
	"time"

	jwtlib "github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID string `json:"user_id"`
	Phone  string `json:"phone"`
	Role   string `json:"role"`
	jwtlib.RegisteredClaims
}

type JWTService struct {
	secretKey string
}

func New(secretKey string) *JWTService {
	return &JWTService{
		secretKey: secretKey,
	}
}

func (s *JWTService) GenerateToken(userID, phone, role string, expiresIn time.Duration) (string, error) {
	claims := &Claims{
		UserID: userID,
		Phone:  phone,
		Role:   role,
		RegisteredClaims: jwtlib.RegisteredClaims{
			ExpiresAt: jwtlib.NewNumericDate(time.Now().Add(expiresIn)),
			IssuedAt:  jwtlib.NewNumericDate(time.Now()),
		},
	}

	token := jwtlib.NewWithClaims(jwtlib.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.secretKey))
}

func (s *JWTService) ValidateToken(tokenString string) (*Claims, error) {
	claims := &Claims{}
	_, err := jwtlib.ParseWithClaims(tokenString, claims, func(token *jwtlib.Token) (interface{}, error) {
		return []byte(s.secretKey), nil
	})
	if err != nil {
		return nil, err
	}
	return claims, nil
}
