#!/bin/bash

# Read JSON input from stdin
input=$(cat)

# Get current directory (basename only)
cwd=$(echo "$input" | jq -r '.workspace.current_dir')
dir=$(basename "$cwd")

# Get git branch and worktree info (skip locks)
# Use git rev-parse to detect git repos including worktrees (where .git is a file, not dir)
git_root=$(cd "$cwd" && git -c core.useBuiltinFSMonitor=false rev-parse --show-toplevel 2>/dev/null)
if [ -n "$git_root" ]; then
  branch=$(cd "$cwd" && git -c core.useBuiltinFSMonitor=false branch --show-current 2>/dev/null)

  # Detect if this is a linked worktree (not the main worktree)
  # Main worktree has .git as a directory; linked worktrees have .git as a file
  git_dot=$(cd "$cwd" && git -c core.useBuiltinFSMonitor=false rev-parse --git-dir 2>/dev/null)
  main_git=$(cd "$cwd" && git -c core.useBuiltinFSMonitor=false rev-parse --git-common-dir 2>/dev/null)

  worktree_label=""
  if [ -n "$git_dot" ] && [ -n "$main_git" ] && [ "$git_dot" != "$main_git" ]; then
    # This is a linked worktree — derive name from the worktree directory basename
    worktree_name=$(basename "$git_root")
    worktree_label="[wt:${worktree_name}]"
  fi

  if [ -n "$branch" ] && [ -n "$worktree_label" ]; then
    git_info=" (${branch}) ${worktree_label}"
  elif [ -n "$branch" ]; then
    git_info=" (${branch})"
  elif [ -n "$worktree_label" ]; then
    git_info=" ${worktree_label}"
  else
    git_info=""
  fi
else
  git_info=""
fi

# Extract model display name and shorten it
model_full=$(echo "$input" | jq -r '.model.display_name')
case "$model_full" in
  "Claude 3.5 Sonnet"*) model="S3.5" ;;
  "Claude Opus 4.5"*) model="O4.5" ;;
  "Claude Sonnet 4.5"*) model="S4.5" ;;
  "Claude Opus 4.6"*) model="O4.6" ;;
  "Claude Sonnet 4.6"*) model="S4.6" ;;
  "Claude 3.5 Haiku"*) model="H3.5" ;;
  "Claude 3 Haiku"*) model="H3" ;;
  *) model="$model_full" ;;
esac

# Session name — only show if explicitly set (not a UUID / default name)
# UUIDs match: 8-4-4-4-12 hex pattern
session_name_raw=$(echo "$input" | jq -r '.session_name // empty')
session_label=""
if [ -n "$session_name_raw" ]; then
  if ! echo "$session_name_raw" | grep -qE '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'; then
    session_label=" | Session: ${session_name_raw}"
  fi
fi

# Get context info: tokens used and percentage used
total_input=$(echo "$input" | jq -r '.context_window.total_input_tokens // 0')
total_output=$(echo "$input" | jq -r '.context_window.total_output_tokens // 0')
ctx_size=$(echo "$input" | jq -r '.context_window.context_window_size // 0')
used_pct=$(echo "$input" | jq -r '.context_window.used_percentage // empty')


# Function to generate progress bar
# Args: percentage (0-100), width (default 10)
generate_bar() {
  local pct=${1:-0}
  local width=${2:-10}

  # Calculate filled chars (round percentage)
  local filled=$(( (pct * width + 50) / 100 ))
  [ "$filled" -gt "$width" ] && filled=$width
  [ "$filled" -lt 0 ] && filled=0

  local empty=$((width - filled))

  # Build bar
  local bar=""
  for ((i=0; i<filled; i++)); do bar="${bar}="; done
  for ((i=0; i<empty; i++)); do bar="${bar} "; done

  echo "$bar"
}

# Conversation context usage bar (NOT session/daily limit - that data isn't available)
# This shows how much of the current conversation's context window is used
session_pct=$(echo "$input" | jq -r '.context_window.used_percentage // 0')
session_bar=$(generate_bar "$session_pct" 10)

# Color codes
blue='\033[38;5;75m'
cyan='\033[36m'
yellow='\033[33m'
green='\033[32m'
reset='\033[0m'

# Build prompt: [dir] [model/ctx] [bar] % (branch) "session name"
output=""
output="${output}${blue}[${dir}]${reset}"
output="${output} ${cyan}[${model}]${reset}"

# Add context usage bar (defaults to 0% before first API call)
output="${output} ${green}[${session_bar}] ${session_pct}%${reset}"

output="${output}${yellow}${git_info}${reset}"

# Session name (only if explicitly set, not UUID)
if [ -n "$session_label" ]; then
  output="${output}${cyan}${session_label}${reset}"
fi

printf "%b" "$output"
