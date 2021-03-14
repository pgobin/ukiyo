APP_DIR=/opt
APP_DIR_PYENV=/Users/pgobin/.local

export PATH=$APP_DIR/homebrew/bin:$PATH
export PATH=$APP_DIR/minikube/bin:$PATH
export PATH=$APP_DIR_PYENV/bin:$PATH

export CLICOLOR=1
export LSCOLORS=ExFxBxDxCxegedabagacad
export PS1="\[\033[36m\]\u\[\033[m\]@\[\033[32m\]\h:\[\033[33;1m\]\w\[\033[m\]\$"
export PYTHONIOENCODING=utf-8
export VISUAL=code
export POWERLINE_CONFIG_COMMAND=$APP_DIR_PYENV/bin/powerline-config
export POWERLINE_REPOSITORY_ROOT=$APP_DIR_PYENV/lib/python3.9/site-packages

eval "$(pyenv init -)"
. $POWERLINE_REPOSITORY_ROOT/powerline/bindings/zsh/powerline.zsh
. $APP_DIR/homebrew/opt/powerlevel10k/powerlevel10k.zsh-theme

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
alias zp="code ~/.zprofile"
alias mem="ps -Ao command,pid,%mem,%cpu,rss,start,time -mc | peco"
alias backup="mackup -f backup"
alias vtop="vtop --theme=seti"

weather() { curl "wttr.in/"$1"?format=3" }
