package ratelimit

import (
	"sync"
	"time"
)

type entry struct {
	count     int
	resetTime time.Time
}

type Limiter struct {
	mu     sync.Mutex
	limits map[string]entry
	max    int
	window time.Duration
}

func New(max int, window time.Duration) *Limiter {
	return &Limiter{
		limits: make(map[string]entry),
		max:    max,
		window: window,
	}
}

func (l *Limiter) Allow(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	e, exists := l.limits[key]

	if !exists || now.After(e.resetTime) {
		l.limits[key] = entry{
			count:     1,
			resetTime: now.Add(l.window),
		}
		return true
	}

	if e.count >= l.max {
		return false
	}

	e.count++
	l.limits[key] = e
	return true
}
