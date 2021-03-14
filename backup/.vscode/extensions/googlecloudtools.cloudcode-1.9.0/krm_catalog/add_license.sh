if [ -z $GHTOKEN ] 
then
  echo "Must set GHTOKEN"
  exit 1
fi

if [ -z $GHUSER ] 
then
  echo "Must set GHTOKEN"
  exit 1
fi

for dir in $(ls data/apigroups/)
do
  sleep 2
  echo Doing data/apigroups/$dir
  owner_repo=$(cat data/apigroups/$dir/groupdef.yaml | grep repo_url | cut -f 4-5 -d "/")
  echo Doing $owner_repo
  curl -o - -u $GHUSER:$GHTOKEN https://api.github.com/repos/$owner_repo > license.json
  license=$(cat license.json | jq .license.key)
  echo $license
  echo Exit code $?
  echo "  license: $license" 
  echo "  license: $license" >> data/apigroups/$dir/groupdef.yaml
  sleep 1
done
