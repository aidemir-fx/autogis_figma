package s3client

import "testing"

func TestEndpointURL(t *testing.T) {
	tests := []struct {
		name     string
		endpoint string
		useSSL   bool
		want     string
	}{
		{name: "local endpoint", endpoint: "rustfs:9000", want: "http://rustfs:9000"},
		{name: "secure local endpoint", endpoint: "rustfs:9000", useSSL: true, want: "https://rustfs:9000"},
		{name: "explicit scheme", endpoint: "https://media.example.test", want: "https://media.example.test"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := endpointURL(test.endpoint, test.useSSL); got != test.want {
				t.Fatalf("endpointURL() = %q, want %q", got, test.want)
			}
		})
	}
}
