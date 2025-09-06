package handlers

import "sync"
import "time"

var (
    mu sync.Mutex
    userCompletions = make(map[string]map[int]time.Time)
)
