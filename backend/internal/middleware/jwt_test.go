package middleware

import "testing"

func TestBuildAllowedOrigins(t *testing.T) {
	origins := buildAllowedOrigins("http://localhost:3000")
	if _, ok := origins["http://localhost:3000"]; !ok {
		t.Fatalf("expected custom localhost origin to be allowed")
	}
	if _, ok := origins["http://127.0.0.1:3000"]; !ok {
		t.Fatalf("expected localhost mirror origin to be allowed")
	}

	origins = buildAllowedOrigins("https://example.com")
	if _, ok := origins["https://example.com"]; !ok {
		t.Fatalf("expected custom origin to be allowed")
	}
	if _, ok := origins["http://localhost:5173"]; !ok {
		t.Fatalf("expected default localhost origin to be allowed")
	}
}
