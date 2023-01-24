#!/bin/usr/env node

var https = require("https");
var fs = require("fs");
var rl = require("readline");
var sockserv = require("websocket").server;
var sockframe = require("websocket").frame;

var glob = {
    // config vars
    config: {},
    // user vars
    users: [],
    // log format
    log: (msg) => console.log((new Date()).toLocaleTimeString() + ": " + msg),
    // hidden vars used in init() (mostly)
    hidden: {
        write_to_config: true,
        write_to_users: true,
        input_line: {
            term: rl.createInterface({
                input: process.stdin,
                output: process.stdout,
                prompt:"server > ",
                terminal: true,
                crlfDelay: Infinity
            }),
            available: false,
            str: ""
        }
    },
    // check if obj.p exists; if not, request it as string from stdin
    // returns true if obj.p exists, false otherwise
    check_obj: (obj, ppt, req, man) => {
        if (obj.p) return true;
        glob.log(ppt);
        if (req) try {
            while (!glob.hidden.input_line.available);
            glob.hidden.input_line.available = false;
            obj.p = glob.hidden.input_line.str;
        } catch(err) {
            obj.p = undefined;
            if (man) {
                glob.log("Could not read! Aborting...");
                process.exit(1);
            }
        }
        if (man) { process.exit(1); }
        return false;
    },
    backup: () => {
        if (glob.hidden.write_to_config) {
            glob.hidden.write_to_config = false;
            fs.writeFile("./config.json", JSON.stringify(glob.config, null, 4), "ascii", () => {glob.hidden.write_to_config = true});
        }
        if (glob.hidden.write_to_users) {
            glob.hidden.write_to_users = false;
            fs.writeFile(glob.config.user_data, JSON.stringify(
                glob.users.map(x => {return {name: x.name, pass_hash: x.pass_hash}}),
            null, 4), "ascii", () => {glob.hidden.write_to_users = true})
        }
    },
    main: () => {             
        glob.server.on("request", (req) => {
            return;
        });
    },
    init: () => {
        // setup stdin reading
        process.stdin.unref();
        glob.hidden.input_line.term.on("line", (str) => {
            glob.hidden.input_line.str = str;
            glob.hidden.input_line.available = true;
        })
        // read configs
        try {
            config = JSON.parse(fs.readFileSync("./config.json", "ascii"));
        } catch (err) {
            glob.log("config.json not found or not in standard JSON format! Info that would \
be required from the file \ will now be requested via prompts.");
        }
        // read former user data, if available
        glob.check_obj({p:glob.config.user_data},
            "User data path not specified. Set \'user_data\' in config.json. File path:",
            true, true);
        if (fs.existsSync(glob.config.user_data)){
            glob.users = JSON.parse(fs.readFileSync(glob.config.user_data, "ascii"));
            if (!(glob.users.isArray() && glob.users[0].name && glob.users[0].pass_hash)) {
                glob.users = [];
                glob.log("User file does not conform! Users reset; file will be wiped. Consider \
killing the process.");
                system
            }
        }
        else
            glob.log("Specified user data file does not exist! (Ignore this warning \
if the server is running for the first time.)")
        // read ssl files; pray that https module fails if details are off
        if (!glob.config.ssl) glob.config.ssl = {};
        glob.check_obj({p:glob.config.ssl.key_file},
            "SSL key path not specified. Set 'ssl.key_file' in config.json. File path:",
            true, true);
        glob.check_obj({p:glob.config.ssl.key_file},
            "SSL certificate path not specified. Set 'ssl.cert_file' in config.json. File path:",
            true, true);
        glob.check_obj({p:glob.config.ssl.key_file},
            "SSL pass phrase not specified. Set 'ssl.pass_phrase' in config.json. Phrase:",
            true, true);
        glob.hidden.httpslayer = https.createServer(
            {key: fs.readFileSync(glob.config.ssl.key_file),
                cert: fs.readFileSync(glob.config.ssl.cert_file),
                passphrase: glob.config.ssl.pass_phrase},
            (_, response) => response.writeHead(404)
        );
        glob.check_obj({p:glob.hidden.httpslayer},
            "Server did not start. It's probably because of incorrect certificate data.",
            false, true);
        setInterval(glob.backup(), 100000);
        process.addListener("beforeExit", glob.backup());
        let port = glob.config.port ? glob.config.port : 443;
        glob.hidden.httpslayer.listen(
            port,
            () => glob.log("Server listening on port" + port + ".")
        );
        glob.server = new sockserv({
            httpServer: glob.hidden.httpslayer,
            autoAcceptConnections: false
        })
        glob.main();
    }
};

glob.init();