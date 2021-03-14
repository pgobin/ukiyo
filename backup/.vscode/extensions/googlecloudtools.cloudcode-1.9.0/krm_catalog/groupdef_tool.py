#!/usr/bin/env python3
import yaml
import sys
import os.path
import glob
import base64
import datetime
import tempfile
import urllib.request

from github import Github
from github import GithubException
from github import UnknownObjectException

# Keep this list synced with README.
ALLOWED_LICENSE_KEYS = frozenset([
  "apache-2.0",
  "bsd-3-clause",
  "mit",
  "mpl-2.0"
])

def Usage():
  argv0 = sys.argv[0]
  print(F"""Usage:
{argv0} validate <path>
{argv0} fetch <path>
{argv0} set <path> <basicjsonpath> <value>
{argv0} get <path> <basicjsonpath>

where <path> contains a groupdef.yaml file.
get and set affect the groupdef.yaml file.
""")
  sys.exit(1)

def DeleteAllFetchedFiles(dirname):
  """Delete all the automatically fetched files described by "groupdeffile" and in its directory""" 
  fileList = glob.glob(dirname + "/*.crd.yaml")
  fileList = fileList + glob.glob(dirname + "/*.sample.yaml")
  for f in fileList:
    try:
      input("Delete " + f + " (enter for yes, ^C for no)? ")
      os.remove(f)
    except Exception as e:
      print("Error while deleting file : ", f, e)


def LoadGroupDefOrExit(groupdeffile):
  """Read content (YAML) from file named groupdeffile.  Exit 1 on error."""
  with open(groupdeffile, "r") as f:
    try:
      y = yaml.safe_load(f)
      return y
    except (yaml.scanner.ScannerError, yaml.parser.ParserError) as e:
      print(groupdeffile, ": Invalid YAML! :", e)
      sys.exit(1)


def WriteGroupDefOrExit(groupdeffile, content):
  """Write content as YAML to file named groupdeffile."""
  with open(groupdeffile, "w") as f:
    f.write(yaml.safe_dump(content))


def FetchContentWithRetryOrExit(ghContentFile):
  """Fetch a pygithub content object with one retry.  Exit 1 on failure."""
  # Download the file content, with one retry.
  content = None
  try:
    content = base64.b64decode(ghContentFile)
  except ConnectionResetError as c:
    print("ConnectionResetError, sleeping and retrying")
    time.sleep(5)
    try: 
      content = base64.b64decode(ghContentFile)
    except Exception as e:
      print("Exception on second try", str(e))
  except Exception as e:
    print("Exception:", str(e))
    print("here5")
    sys.exit(1)
  return content


def GetCrdFilesBySearch(g, repo):
  query = F"CustomResourceDefinition repo:{repo} language:yaml"
  print("Fetching with this query:" , query)
  limits = g.get_rate_limit()
  if limits.search.remaining <= 2:
    seconds = (limits.search.reset - datetime.now()).total_seconds()
    print("Waiting for %d seconds ..." % (seconds))
    time.sleep(seconds)
    print("Done waiting - resume!")
  matches = g.search_code(query=query)
  # TODO: check incomplete_results field, and fail if incomplete.
  fileUrls = {}
  index = 0
  for match in matches:
    fileUrl = match.html_url
    if fileUrl in fileUrls:
      continue  # Can get multiple line matches in same file.
    fileUrls["fileUrl"] = 1
    if fileUrl.find("config/crd/patches") != -1 or fileUrl.find("kustom") != -1:
      print("Skipping file that looks like a kustomize patch:", fileUrl)
      continue

    print("Fetching", fileUrl)
    try:
      content = FetchContentWithRetryOrExit(match.content)
      yield content
    except GithubException as e:
      print("Unable to get content, possible stale github search index")


def GetExactFiles(g, repo, paths):
  """Get files from github using an exact path."""
  repo = g.get_repo(repo)
  for path in paths:
    try:
      contents = repo.get_contents(path)
      contents = FetchContentWithRetryOrExit(contents.content)
      yield contents
    except GithubException as e:
      print("Github error when fetching repo", repo, "path", path, ":", e)


def GetRelease(g, repo, assetNames):
  """Get files from github using a release artifact name."""
  repo = g.get_repo(repo)
  releases = repo.get_releases()
  print("FYI, these are the release tags:")
  print(list(r.tag_name for r in releases))
  print("Picking latest release.")
  print("These are the assets of the latest release")
  found_assets = dict((asset.name, asset) for asset in repo.get_latest_release().get_assets())
  for name in assetNames:
    try:
      if name not in found_assets:
        print("Requested asset not found in latest release: ", name)
        continue
      else:
        asset = found_assets[name]
        print("here I would be downloading this url:", asset.browser_download_url)
        print('Beginning file download with urllib2...')
        contents = urllib.request.urlopen(asset.browser_download_url).read()
        yield contents
    except GithubException as e:
      print("Github error when fetching repo", repo, "path", path, ":", e)


def ExtractObjectsFromYamlFile(yamlfilecontent):
  """Extract yaml objects from files.

  yamlfilecontent: a list of strings (potential yaml files loaded as strings,
                   with no special preprocessing.)
  
  Silently skips files with go templates.  
  
  Saves other files that fail to parse to a tempfile for later
  debugging and prints a message about it.

  Returns a list of parsed yaml files, possibly empty.
  """
  # Try to parse all the objects in all the files we found.
  try:
    return list(yaml.safe_load_all(yamlfilecontent))
  except yaml.YAMLError:
    if content.find(b'{{') != -1:
      print("Skipping file that looks a helm chart with templating.")
    else:
      print("Bad YAML file:", full_filename)
      with tempfile.NamedTemporaryFile(prefix="fetch-") as f:
        print("Bad YAML file saved as:", f.name)
        f.write(content)
      return []


def Fetch(groupdeffile):
  """Do the fetch subcommand."""
  y = LoadGroupDefOrExit(groupdeffile)
  
  knownStrategies = ("githubSearch", "githubExactPath", "githubRelease")

  strategy = y["spec"]["strategy"]
  if strategy not in knownStrategies:
    print(groupdeffile, ": Strategy must be one of :", knownStrategies)
    sys.exit(1)
  repoUrl = y["spec"]["repoUrl"]
  workDir = os.path.dirname(groupdeffile)
  groupNames = y["spec"]["groupNames"]
  # Delete the old files so that it is certain that all files in the dir were fetched
  # at the same time.
  DeleteAllFetchedFiles(workDir)

  g = NewGithubClient()

  # Fetch Repo license
  repo = "/".join(repoUrl.split("/")[-2:])
  try:
    repoObj = g.get_repo(repo)
    licenseKey = repoObj.raw_data["license"]["key"]
  except (GithubException, UnknownObjectException) as e:
    print("Unable to obtain license for repo", repo, ":", e)
    sys.exit(1)
  print(licenseKey)

  if licenseKey not in ALLOWED_LICENSE_KEYS:
    sys.exit(F"Invalid license type found: {licenseKey}")

  # We are going to do this in two phases.  In Phase 1, we search for CRDs.
  # Second Phase will be to find sample CRs of the types of those CRDs.
  # This allows use to find samples for newly introduced types without
  # Needing to list all the kinds we desire to find in the groupdef.
  # It also allows us to know what patterns to search for in the second pass.

  #######################
  # Phase 1: Fetch CRDs #
  #######################
  if strategy == "githubSearch":
    files = GetCrdFilesBySearch(g, repo)
  elif strategy == "githubRelease":
    assetNames = y["spec"]["assetNames"]
    files = GetRelease(g, repo, assetNames)
  else:
    exactPaths = None
    exactPaths = y["spec"]["exactPaths"]
    files = GetExactFiles(g, repo, exactPaths)

  objs = []
  for content in files:
    objs.extend(ExtractObjectsFromYamlFile(content))

  saved_gvks = set()
  # Write out objects which look like CRDs and match the desired group.
  # Track what GVKs we have seen.
  for o in objs:
    if not IsCrd(o):
      continue
    gvks = GetGVKsDefinedByCRD(o)
    group, versions, kind = gvks
    if group not in groupNames:
      print("Skipping wrong group:", group)
      continue

    for v in versions:
      gvk = (group, v, kind)
      if gvk not in saved_gvks:
        print("Found", gvk)
      else:
        print("Duplicate of", gvk)
      saved_gvks.add((group, v, kind))

    crdfile = F"{workDir}/{group}_{kind}.crd.yaml"
    print("Writing", crdfile)
    with open(crdfile, "w") as f:
      yaml.safe_dump(o, stream=f)

  print("Found these gvks:", saved_gvks)

  #######################
  # Phase 2: Fetch CRs  #
  #######################
  files = []
  if strategy == "githubSearch":
    print("Fetching CRs by search not supported yet")
    # TODO: for each CR type, search for it.
  elif strategy == "githubExactPath":
    if "sampleExactPaths" in y["spec"]:
      sampleExactPaths = y["spec"]["sampleExactPaths"]
      files = GetExactFiles(g, repo, sampleExactPaths)

  objs = []
  for content in files:
    objs.extend(ExtractObjectsFromYamlFile(content))

  for o in objs:
    # Write out objects which have a group matching the desired group,
    # and an kind matching any of the kinds found above.
    # TODO: how to decide which sample to keep when there are several?
    gvk = GetGVK(o)
    if gvk is None:
      print("Unidentifiable object in yaml file.")
      with tempfile.NamedTemporaryFile(prefix="fetch-") as f:
        print("Bad YAML segment saved as:", f.name)
        f.write(content)
      continue
    if gvk not in saved_gvks:
      print("Skipping unrelated GVK:", gvk)
      continue
    # TODO: fix to pick "best" one.  Longest or shortest?
    group, _, kind = gvk
    samplefile = F"{workDir}/{group}_{kind}.sample.yaml"
    print("Writing", samplefile)
    with open(samplefile, "w") as f:
      yaml.safe_dump(o, stream=f)

  # Write groupdef.yaml with updated status.
  y["status"] = {}
  y["status"]["howAdded"] = "fetchedFromGithub" 
  y["status"]["license"] = licenseKey
  y["status"]["lastModifiedDate"] = str(datetime.date.today())
  WriteGroupDefOrExit(groupdeffile, y)
  sys.exit(0)


def GetGVK(o):
  """Get Group, Version, Kind of a KRM object o.

  o: unmarshalled JSON or YAML file (dict).

  returns tuple (g,v,k) or None on parsing error.
  """  
  try:
    gv = o["apiVersion"]
    k = o["kind"]
    g, v = gv.split("/")
    return (g, v, k)
  except (KeyError, TypeError, ValueError):
    return None


def GetGVKsDefinedByCRD(o):
  """Get group, versions and kind that a CRD defines.

     returns a tuple (group, versions, kind) or None on error.
       group: string
       versions: list of string
       kind: string
  """
  if not IsCrd(o):
    return None
  if not "spec" in o or not "group" in o["spec"]:
    print("Bad CRD:", o)
  group = o["spec"]["group"]
  kind = o["spec"]["names"]["kind"]
  versions = set()
  if "versions" in o["spec"]:
    versions.update([x["name"] for x in o["spec"]["versions"]])
  if "version" in o["spec"]:
    versions.add(o["spec"]["version"])
  versions = list(versions)
  return (group, versions, kind)


def IsCrd(o):
  """ True if loaded yaml file "o" is a Custom Resource Definition."""
  gvk = GetGVK(o)
  if gvk is None:
    return False
  g, v, k = gvk
  if g == "apiextensions.k8s.io" and v in ("v1beta1", "v1") and k == "CustomResourceDefinition":
    return True
  return False


def NewGithubClient():
  """Get a pygithub instance that can connect to github."""
  g = None
  if "GHTOKEN" in os.environ:
    g = Github(os.environ["GHTOKEN"])
  elif "GHPASSWORD" in os.environ:
    g = Github(os.environ["GHUSER"],
               os.environ["GHPASSWORD"])
  else:
    sys.exit("No GHTOKEN or GHPASSWORD")
  return g


def ValidateGroupDefFile(filename):
  y = LoadGroupDefOrExit(groupdeffile)

  if "spec" not in y:
    print(groupdeffile, ": No spec!")
    sys.exit(1)
  if "repoUrl" not in y["spec"]:
    print(groupdeffile, ": No spec.repoUrl!")
    sys.exit(1)
  if "groupNames" not in y["spec"]:
    print(groupdeffile, ": No spec.groupNames!")
    sys.exit(1)
  groupNames = y["spec"]["groupNames"]

  if "status" not in y:
    print(groupdeffile, ": No status!")
    sys.exit(1)
  if "license" not in y["status"]:
    print(groupdeffile, ": No status.license!")
    sys.exit(1)
  if y["status"]["license"] not in ALLOWED_LICENSE_KEYS:
    print(groupdeffile, ": Invalid license:", y["status"]["license"])
    sys.exit(1)


def Validate(groupdeffile):
  """Runs the validate subcommand."""
  workDir = os.path.dirname(groupdeffile)
  ValidateGroupDefFile(groupdeffile)

  # Validate CRD filenames and contents.
  fileList = glob.glob(workDir + "/*")
  group = os.path.split(workDir)[-1]
  print(group)
  success = False
  for f in fileList:
    fbase = os.path.basename(f)
    if fbase == "groupdef.yaml":
      continue
    elif fbase.endswith(".crd.yaml"):
      if not ValidateCRDFile(f, allowedGroups=[group]):
        success = False
    elif fbase.endswith(".sample.yaml"):
      # TODO: need to do two passes to find allowed kinds?
      if not ValidateSampleFile(f, allowedGroups=[group]):
        success = False
    else:  
      print("Unexpected file:", f)
      success = False
  if success:
    sys.exit(0)
  else:
    sys.exit(1)


def ValidateCRDFile(full_filename, allowedGroups=None):
  """Validates a file holding a CRD."""
  fbase = os.path.basename(full_filename)
  fdir = os.path.dirname(full_filename)

  group_kind = fbase[:-len(".crd.yaml")]
  parts = group_kind.split("_")
  if len(parts) != 2:
    print("Invalid structure of filename:", fbase)
    return False
  fgroup = parts[0]
  fkind = parts[1]
 
  try:
    objs = list(yaml.safe_load_all(open(full_filename)))
  except yaml.YAMLError:
    print("Bad YAML file:", full_filename)
    return False

  if len(objs) > 1:
    print("Error, multiple objects in ", full_filename)
  o = objs[0]
  if not IsCrd(o):
    return False

  group = o["spec"]["group"]
  if allowedGroups is not None and group not in allowedGroups:
    print(F"Mismatch of group name between path's covered groups and contents: Allowed " +
          F"{allowedGroups} but contents has {group} in file {full_filename}")
    return False
  if group != fgroup:
    print(F"Mismatch of group name between filename and contents: Filename has: " +
          F"{fgroup} but contents has {group} in file {full_filename}")
    return False
    
  kind = o["spec"]["names"]["kind"]
  if fkind != kind:
    print(F"Mismatch of kind between filename and contents: Filename has: " +
          F"{fkind} but contents has {kind} in file {full_filename}")
    return False

  return True


def ValidateSampleFile(full_filename, allowedGroups=None):
  """Validates a file holding a sample CR."""
  fbase = os.path.basename(full_filename)
  fdir = os.path.dirname(full_filename)

  group_kind = fbase[:-len(".sample.yaml")]
  parts = group_kind.split("_")
  if len(parts) != 2:
    print("Invalid structure of filename:", fbase)
    return False
  fgroup = parts[0]
  fkind = parts[1]
 
  try:
    objs = list(yaml.safe_load_all(open(full_filename)))
  except yaml.YAMLError:
    print("Bad YAML file:", full_filename)
    return False

  if len(objs) > 1:
    print("Error, multiple objects in ", full_filename)
  o = objs[0]

  group, version, kind = GetGVK(o)
  if allowedGroups is not None and group not in allowedGroups:
    print(F"Mismatch of group name between path's covered groups and contents: Allowed " +
          F"{allowedGroups} but contents has {group} in file {full_filename}")
    return False
  if group != fgroup:
    print(F"Mismatch of group name between filename and contents: Filename has: " +
          F"{fgroup} but contents has {group} in file {full_filename}")
    return False
  if fkind != kind:
    print(F"Mismatch of kind between filename and contents: Filename has: " +
          F"{fkind} but contents has {kind} in file {full_filename}")
    return False

  # TODO: check version in sample name.
  return True

def Get(groupdeffile, jsonpath):
  """Runs the get subcommand."""
  y = LoadGroupDefOrExit(groupdeffile)
  ypart = y
  path = jsonpath.split(".")
  for item in path:
    if item in ypart:
      ypart = ypart[item]
    else:
      sys.exit(1)
  print(ypart)
  sys.exit(0)
   

def Set(groupdeffile, jsonpath, value):
  """Runs the set subcommand."""
  y = LoadGroupDefOrExit(groupdeffile)
  ypart = y
  path = jsonpath.split(".")
  for item in path[:-1]:
    if item in ypart:
      ypart = ypart[item]
    else:
      sys.exit(1)
  ypart[path[-1]] = value

  WriteGroupDefOrExit(groupdeffile, y)
  sys.exit(0)


if len(sys.argv) < 3:
  Usage()
if not sys.argv[1] in ["set", "get", "validate", "fetch"]:
  Usage()
command = sys.argv[1]
groupdeffile = os.path.join(sys.argv[2], "groupdef.yaml")
if not os.path.exists(groupdeffile):
  Usage()
if command == "validate" or command == "fetch":
  if len(sys.argv) != 3:
    Usage()
  if command == "validate":
    Validate(groupdeffile)
  if command == "fetch":
    Fetch(groupdeffile)
if command == "set" or command == "get":
  if len(sys.argv) < 4:
    Usage()
  jsonpath = sys.argv[3]
  if command == "get":
    Get(groupdeffile, jsonpath)
  elif command == "set":
    if len(sys.argv) < 5:
      Usage()
    value = sys.argv[4]
    Set(groupdeffile, jsonpath, value)
