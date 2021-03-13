APP_DIR=/opt
export PATH=$APP_DIR/homebrew/bin:$PATH

eval "$(pyenv init -)"

export CLICOLOR=1
export LSCOLORS=ExFxBxDxCxegedabagacad
export PS1="\[\033[36m\]\u\[\033[m\]@\[\033[32m\]\h:\[\033[33;1m\]\w\[\033[m\]\$"
export PYTHONIOENCODING=utf-8
export VISUAL=code

~/.local/bin/powerline-daemon -q
POWERLINE_BASH_CONTINUATION=1
POWERLINE_BASH_SELECT=1
export POWERLINE_CONFIG_COMMAND=~/.local/bin/powerline-config
. ~/.local/lib/python3.9/site-packages/powerline/bindings/shell/powerline.sh

alias c="clear"
alias cl="clear"
alias ckear="clear"
alias clr="clear"

alias l="ls"
alias ls='ls -GFha'
alias ll='ls -GFhal'
alias h="history"

alias ..="cd .."
alias ...="cd ../.."

alias gs="git status"
alias gl="git lg"
alias ga="git add ."
alias gcs="git commit -s"

alias :q="exit"
alias die="exit"
alias mkdir="mkdir -p"

alias serve="python -m SimpleHTTPServer"
alias copy="pbcopy"

alias apt="brew"
alias apt-get="brew"
alias yum="brew"

alias renew=". ~/.zprofile"
alias mem="ps -Ao command,pid,%mem,%cpu,rss,start,time -mc | peco"
alias backup="mackup -f backup"

weather() { curl wttr.in/"$1"?0; }
