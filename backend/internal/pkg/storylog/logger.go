package storylog

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sync"
)

// Logger writes a separate operational log for Story and media-processing
// events. It is intentionally best-effort: failure to open the file must not
// prevent the API from starting.
type Logger struct {
	mu     sync.Mutex
	file   *os.File
	logger *log.Logger
}

func New(path string) (*Logger, error) {
	if path == "" {
		path = "runtime-logs/stories.log"
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, err
	}
	file, err := os.OpenFile(path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o640)
	if err != nil {
		return nil, err
	}
	return &Logger{file: file, logger: log.New(file, "", log.LstdFlags|log.Lmicroseconds|log.LUTC)}, nil
}

func (l *Logger) Printf(format string, args ...any) {
	if l == nil || l.logger == nil {
		return
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	l.logger.Printf(format, args...)
}

func (l *Logger) Close() error {
	if l == nil || l.file == nil {
		return nil
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.file.Close()
}

func Event(name string, fields ...any) string {
	message := name
	for i := 0; i+1 < len(fields); i += 2 {
		message += fmt.Sprintf(" %v=%v", fields[i], fields[i+1])
	}
	return message
}
