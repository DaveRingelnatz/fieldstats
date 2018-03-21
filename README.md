# fieldstats
NodeJS script for receiving important data of own node from carriotaField (IOTA load balancer)

**INSTALLATION**

- login to your node's console/bash
- copy and paste the following line to your console
```sh
        $ cd && mkdir fieldstats && git clone https://github.com/DaveRingelnatz/fieldstats.git && cd fieldstats && npm install
```
- this will go to your homedir, create the folder "fieldstats" and installs everything there
- to use the script:
```sh
        $ node fieldstats.js
```
- ENJOY

**UPDATE**

- remove complete installation directory and do a fresh install
```sh
        $ cd && rm -r fieldstats && mkdir fieldstats && git clone https://github.com/DaveRingelnatz/fieldstats.git && cd fieldstats && npm install
```

**SETTINGS**

SINGLE NODE

- if you are using IRI playbook
    - DO NOTHING
- else
    - set "nodeName" manually in script
        or
    - change path to field.ini file in variable "fieldIni"
    
MULTIPLE NODES

- if you have multiple nodes configure the array "nodePublicIds" in the following way (you will get the sum over all your nodes at the end of the script)
```
const nodePublicIds = ["foo", "fighters"];
```    

**IOTA DONATIONS**

are always welcome :)

```
NJUNMJXQABDCRENNSJAU99CWHTFXHSRRRWVLASRSFUCSXEGREDPWMISWJKDFTOXQWIXLJOJBVBSNIQXFCLKUXBTSVD
```
