#!/bin/bash
for group in $(ls data/apigroups);
do
  # Validate the groupdef file and that it matches the directory file contents.
  ./groupdef_tool.py validate data/apigroups/$group
  # Client and server side validate each CRD.
  # TODO: make this step hermetic using a docker image with kind and kubectl.
  for crd in $(ls data/apigroups/$group/*.crd.yaml);
  do
    kubectl apply --dry-run -f $crd > /dev/null
  done
done

