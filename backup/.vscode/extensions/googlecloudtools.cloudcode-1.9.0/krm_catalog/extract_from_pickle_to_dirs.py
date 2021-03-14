import os
import sys
import pickle
import yaml
import json
import collections
import operator

def RepoPath(url):
  return "/".join(url.split("/")[:5])

# Run from root of project.
APIGROUP_BASE = "./data/apigroups"
if not os.path.isdir("./data") or not os.path.isdir("./data/apigroups"):
  print("Run from root of project")

# Prereq: get pre-collected data:# 
# gcloud config set project eric-tune-public
# gsutil cp gs://k8s-crd-data-oct-2019/yaml_crd_revisions_by_gk.p ./yaml_crd_revisions_by_gk.p
DATA_COLLECTION_DATE = "2019-10-20"  # Approximate
crds_by_gk = pickle.load(open( "yaml_crd_revisions_by_gk.p", "rb" ))

DEBUG_GROUPS = [
  "config.istio.io",
  "google.kubeform.com",
  "perf.kubestone.xridge.io",
  "flinkoperator.k8s.io"
]


GOOD_DOMAINS = '''agones.dev
appscode.com
argoproj.io
banzaicloud.com
bitnami.com
cdap.io
cert-manager.io
certmanager.k8s.io
cloud.google.com
cloudrun.com
confluent.cloud
containo.us
coreos.com
dynatrace.com
elastic.co
gatekeeper.sh
getambassador.io
gke.io
google.com
heptio.com
isla.solutions
istio.io
jaegertracing.io
jenkins.io
k8s.io
kiali.io
knative.dev
konghq.com
kope.io
kubeapps.com
kubeflow.org
kubeless.io
kyma-project.io
linkerd.io
memsql.com
nats.io
networkservicemesh.io
ory.sh
projectcalico.org
reactiveops.io
seldon.io
strimzi.io
tekton.dev
velero.io
weave.works'''.splitlines()

# group CRDs by group and then by kind

crds_by_g = collections.defaultdict(lambda: collections.defaultdict(dict))
for gk, crds in crds_by_gk.items():
  g, k = gk
  assert k not in crds_by_g[g]
  crds_by_g[g][k] = crds

for g, this_group_crds_by_kind in crds_by_g.items():
  group_dir = APIGROUP_BASE + "/" + g
  
  # Sampling for debugging
  if not any([g.endswith(domain) for domain in GOOD_DOMAINS]):
    continue

  if os.path.isdir(APIGROUP_BASE + "/" + g):
    # Metadata should be present?
    pass
  else:
    os.mkdir(group_dir)
    print("mkdir " + group_dir)

  # TODO: Infer the canonical github repo for the CRD.
  #  We can't always do this with certainty.  But we'll need to do pull-based updates.
  # For example, we get istio wrong.  Oh well.
  
  counts = collections.defaultdict(int)
  for k, crds in this_group_crds_by_kind.items():
    for url, _ in crds:
      counts[RepoPath(url)] += 1
  maxurl = max(counts.items(), key=operator.itemgetter(1))[0]
  print("  Groups inferred repo url is:", maxurl)

  meta_filename = group_dir + "/" + "groupdef.yaml"
  with open(meta_filename, "w") as f:
    f.write("apiVersion: krm-zoo.erictune.github.io/v1\n")
    f.write("kind: ApiGroupSnapshot")
    f.write("spec:\n")
    f.write("  repo_url: " +  maxurl + "\n")
    f.write("  strategy: manual\n")
    f.write("status:\n")
    f.write("  how_added: original\n")
    f.write("  last_modified_date: " + DATA_COLLECTION_DATE + "\n")
  
  best_crd = None
  for k, crds in this_group_crds_by_kind.items():
   
    # Pick largest revision of the kind crd as "best"
    # TODO: get largest per version in case of multi-version CRDs.
    # Note: may not result in consistent snapshot across all types of the group.
    best_size = 0
    best_index = 0
    best_crd = None
    for i in range(len(crds)):
      url, crd = crds[i]
      try:
        size = len(json.dumps(crd))
      except TypeError:
        size = 0
      if size > best_size:
        best_size = size
        best_index = i
        best_crd = crd
    assert best_crd is not None
    
    crd_file = group_dir + "/" + k + ".crd.yaml"
    print("  writing", crd_file)
    with open(crd_file, "w") as f:
      f.write(yaml.dump(best_crd))
