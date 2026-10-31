package storylog

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
)

type Logger struct {
	file *os.File
	*log.Logger
}

func New(path string) (*Logger, error) {
	if path == "" {
		path = "runtime-logs/stories.log"
	}
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, err
	}

	file, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return nil, err
	}

	return &Logger{
		file:   file,
		Logger: log.New(file, "[STORY] ", log.LstdFlags|log.Lshortfile),
	}, nil
}

func (l *Logger) Close() error {
	if l.file != nil {
		return l.file.Close()
	}
	return nil
}

func (l *Logger) Printf(format string, args ...any) {
	if l == nil || l.Logger == nil {
		return
	}
	l.Logger.Printf(format, args...)
}

func Event(name string, fields ...any) string {
	message := name
	for i := 0; i+1 < len(fields); i += 2 {
		message += fmt.Sprintf(" %v=%v", fields[i], fields[i+1])
	}
	return message
}
