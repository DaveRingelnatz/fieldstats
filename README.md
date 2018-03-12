# fieldstats
NodeJS script for receiving important data of own node from carriotaField (IOTA load balancer)

INSTALLATION:

- login to your node
- create folder "fieldstats"
- enter commands:
```sh
        $ cd fieldstats
        $ npm install request
        $ npm install parse-ini
```
- download file and save it as "fieldstats.js" on node
- enter command:
```sh
        $ node fieldstats.js
```
- ENJOY

SETTINGS:

- if you are using IRI playbook
    - DO NOTHING
- else
    - set "nodeName" manually in script
        or
    - change path to field.ini file in variable "fieldIni"
