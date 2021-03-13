APP_DIR=/opt
path+=$APP_DIR/homebrew/bin/
export PATH

eval "$(pyenv init -)"

export CLICOLOR=1
export LSCOLORS=ExFxBxDxCxegedabagacad
export PS1="\[\033[36m\]\u\[\033[m\]@\[\033[32m\]\h:\[\033[33;1m\]\w\[\033[m\]\$"
export PYTHONIOENCODING=utf-8
export VISUAL=code

powerline-daemon -q
POWERLINE_BASH_CONTINUATION=1
POWERLINE_BASH_SELECT=1
POWERLINE_CONFIG_COMMAND=~/.pyenv/shims/powerline-config
. ~/.pyenv/versions/3.7.4/lib/python3.7/site-packages/powerline/bindings/bash/powerline.sh

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
