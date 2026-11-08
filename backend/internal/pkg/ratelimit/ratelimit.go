// Package ratelimit provides a simple in-memory sliding-window rate limiter.
package ratelimit

import (
	"sync"
	"time"
)

// Limiter tracks per-key request counts within a sliding time window.
type Limiter struct {
	mu     sync.Mutex
	store  map[string][]time.Time
	limit  int
	window time.Duration
}

// New creates a Limiter that allows at most limit requests per window per key.
func New(limit int, window time.Duration) *Limiter {
	return &Limiter{
		store:  make(map[string][]time.Time),
		limit:  limit,
		window: window,
	}
}

// Allow returns true if the key is within its rate limit, false otherwise.
// Expired timestamps are pruned on every call.
func (l *Limiter) Allow(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-l.window)

	ts := l.store[key]
	// prune expired
	valid := ts[:0]
	for _, t := range ts {
		if t.After(cutoff) {
			valid = append(valid, t)
		}
	}

	if len(valid) >= l.limit {
		l.store[key] = valid
		return false
	}
	l.store[key] = append(valid, now)
	return true
}
