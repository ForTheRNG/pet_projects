const http = require("http");
const https = require("https");
const filesys = require("fs/promises");
const URL = require("url").URL;

// Change things here if you feel like it
const statics = {
    generator: "ForTheRNG",
    debug: 0,
    port: 8080,
    ao3link: "https://archiveofourown.org"
};

const funcs = {

    /**
     * Logs things, if debugging is on.
     * @param {string} str String to print.
     * @return {void} Nothing.
     */
    debug: (str) => {
        if (statics.debug) console.log(str);
    },

    /**
     * Writes the damn response. 3 lines, but they repeat.
     * @param {http.ServerResponse} resp Response to be written.
     * @param {string} type Data type.
     * @param {string | Buffer} data Data itself.
     */
    fullresp: (resp, type, data) => {
        resp.setHeader('content-type', type)
            .setHeader('keep-alive', 'timeout=0');
        if (resp.version != '2.0')
            resp.setHeader('transfer-encoding', 'chunked');
        resp.writeHead(200, "OK").write(data, (err) => {
            if (err)
                console.log(JSON.stringify(err));
            resp.end();
        });
    },
    /**
     * Converts parameters into RSS item string.
     * @param {string} title 
     * @param {string} link 
     * @param {Number} guid
     * @param {Date} date
     * @return {string} Formatted data.
     */
    itemrss: (title, link, guid, date) => {
        return "<item>\n<title>"
            + title + "</title>\n<link>"
            + link + "</link>\n<guid isPermaLink=\"false\">"
            + guid + "</guid>\n<pubDate>"
            + date.toUTCString() + "</pubDate>\n</item>\n";
    },
    /**
     * Creates a simple RSS file.
     * @param {string} title 
     * @param {string} link 
     * @param {string} lang 
     * @param {{title: string, link: string, guid: Number, date: Date}[]} itemarr 
     * @return {string} The formatted file.
     */
    simplerss: (title, link, lang, itemarr) => {
        let res = "<rss version=\"2.0\">\n<channel>\n<title>"
            + title + "</title>\n<link>"
            + link + "</link>\n<description>"
            + "Latest updates of \"" + title + "\"</description>\n<language>"
            + lang + "</language>\n<generator>"
            + statics.generator + "</generator>\n";
        itemarr = itemarr.sort((x, y) => x.guid - y.guid).slice(0, 10);
        for (let item of itemarr)
            res += funcs.itemrss(item.title, item.link, item.guid, item.date);
        return res + "</channel>\n</rss>";
    },
    /**
     * Gets an HTTPS page from the given URL, and executes the callback at the end.
     * @param {URL} url URL for the site.
     * @param {(error: Error | null | undefined) => void} error Error maneuvering. Parameter may have an additional property, 'code', to know the HTTPS error code if applicable.
     * @param {(data: string) => void} success Callback function. Takes in the data resulted and processes it.
     * @return {Promise<void>} Nothing.
     */
    getsecpage: (url, error, success) => {
        let data = '';
        let req = https.get(url, (resp) => {
            if (resp.statusCode < 200 || resp.statusCode > 299) {
                resp.resume();
                funcs.debug(resp.statusCode);
                let err = new Error(resp.statusMessage);
                err.code = resp.statusCode;
                error(err);
                return;
            }
            resp.on('data', (chunk) => { data += chunk; });
            resp.on('close', () => success(data));
        }).on('error', error);
        req.end();
    },
    /**
     * Returns an array of matches, as returned by RegExp.match()
     * @param {string} str String to match on.
     * @param {RegExp} regex Regex to match with.
     * @returns {RegExpMatchArray[]} Array of results.
     */
    fullmatch: (str, regex) => {
        if (!regex.global) {
            funcs.debug("made regex /" + regex.source + "/ global");
            regex = new RegExp(regex.source, 'g');
        }
        let arr = [], x = str.matchAll(regex);
        for (let aux = x.next(); !aux.done; aux = x.next())
            arr.push(aux.value);
        return arr;
    }
};

const archiveofourown = {
    /**
     * AO3 error manipulation. Pretty generic tbh, might move it.
     * @param {http.ServerResponse} response The response to be cancelled.
     * @return {(err: Error | null | undefined) => void} Function to call on error. Curried for memorizing the response.
     */
    error: (response) => (err) => {
        if (err.code) {
            response.writeHead(err.code, err.message);
            response.end();
        } else {
            response.writeHead(404, "AO3 server is not responding");
            response.end();
        }
    }, 
    /**
     * @param {string} str HTML data from the page.
     * @return {string} RSS formatted data.
     */
    works: (str) => {
        let title, link, lang, itemarr = [];
        let matches = str.match(/Chapter Index for <a href="\/works\/([0-9]+)\/?">([^\n]+)<\/a> by/);
        title = matches[2];
        funcs.debug("title: " + title);
        link = statics.ao3link + "/works/" + matches[1] + "/";
        funcs.debug("link rebuild: " + link);
        lang = str.match(/<meta name="language" content="([-a-zA-Z]+)"\/>/)[1];
        funcs.debug("language: " + lang);
        itemarr = funcs.fullmatch(str,
            /<li><a href="([a-z0-9/]+)">([^\n]+)<\/a> <[^\n<>]+>\(([0-9]{4}\-[0-9]{2}\-[0-9]{2})\)<\/span><\/li>\n/g);
        itemarr = itemarr.map((x) => { return {
            title: x[2],
            link: statics.ao3link + x[1] + '/',
            date: new Date(x[3] + 'T23:59:59.999Z'),
            guid: x[1].match(/[0-9]+/g)[1]
        };})
        funcs.debug(itemarr.length);
        for (let x of itemarr)
            funcs.debug(x);
        return funcs.simplerss(title, link, lang, itemarr);
    },
    /**
     * @param {string} str HTML data for the page.
     * @return {string} RSS formatted data. 
     */
    series: (str) => {
        let title, link, lang, itemarr = [];
        lang = str.match(/<meta name="language" content="([-a-zA-Z]+)"\/>/)[1];
        funcs.debug("language: " + lang);
        title = str.match(/<h2 class="heading">[ \n\t]*([^\n]+)[ \n\t]*<\/h2>/)[1];
        funcs.debug("title: " + title);
        link = statics.ao3link + str.match(/<a href="(\/series\/[0-9]+)/)[1] + "/";
        funcs.debug("local link rebuild: " + link);
        let itemno = Number.parseInt(str.match(/<dt>Works:<\/dt>[ \n\t]+<dd>([0-9]+)/)[1], 10);
        let dates = funcs.fullmatch(str,
            /<p class="datetime">([a-zA-Z0-9 ]+)<\/p>/g)
            .map((x) => {
                funcs.debug(x[1]);
                let d = new Date(x[1]);
                d.setUTCHours(23, 59, 59, 999);
                return d;
            });
        let links = funcs.fullmatch(str,
            /<h4 class="heading">[ \n\t]+<a href="(\/works\/[0-9]+)">/g)
            .map((x) => statics.ao3link + x[1] + '/');
        let titles = funcs.fullmatch(str,
            /<h4 class="heading">[ \n\t]+<[^<>]*>([^\n]*)<\/a>\n[ \t]*by/g)
            .map((x) => x[1]);
        funcs.debug("work number: " + itemno);
        for (let idx = 0; idx < itemno; idx++)
            itemarr.push({title: titles[idx], link: links[idx], date: dates[idx], guid: links[idx].match(/[0-9]+/)[0]});
        funcs.debug(itemarr.length);
        for (let x of itemarr)
            funcs.debug(x);
        return funcs.simplerss(title, link, lang, itemarr);
    }
};

class Model {
    /**
     * @type {RegExp}
     */
    regex = /./;
    /**
     * @param {string} _ 
     * @param {http.ServerResponse} __ 
     * @return {Promise<void>}
     */
    func = async (_, __) => {};
    /**
     * Match the regex to start the action.
     * @param {RegExp} regex Regex to match for action.
     * @param {(match:string, response:http.ServerResponse) => Promise<void>} func Action to be taken; takes first regex match and the response as parameters.
     */
    constructor(regex, func) {
        this.regex = regex;
        this.func = func;
    }
    /**
     * Calls function on first match of regex on given string and given response.
     * @param {string} str 
     * @param {http.ServerResponse} response 
     */
    async call(str, response) {
        let matches = str.match(this.regex);
        funcs.debug(matches);
        if (!response.taken && matches) {
            response.taken = true;
            await this.func(matches[0], response);
        }
    }
};

/**
 * Array of all the models for different RSS feeds.
 * Contains functions for grabbing the HTML; manipulation is done a bit above
 * @type {Model[]}
 */
const modelarr = [
    new Model(/sourcecode/g, async (_, response) => {
        zip = await filesys.readFile("source.zip");
        funcs.debug("serving source code");
        response.setHeader('content-disposition', 'attachment; filename="source.zip"')
        funcs.fullresp(response, 'application/octet-stream', zip);
    }),
    new Model(/icon/g, async (_, response) => {
        response.writeHead(404, "File does not exist");
        return "";
    }),
    new Model(/ao3\/works\/[0-9]+/g, async (match, response) => {
        let url = new URL(statics.ao3link + "/" + match.substring(4) + "/navigate/");
        funcs.debug("generated URL: " + url.toString());
        funcs.getsecpage(url, archiveofourown.error(response), (data) => {
            funcs.debug("data for work acquired");
            funcs.fullresp(response, 'text/xml', archiveofourown.works(data));
        });
    }),
    new Model(/ao3\/series\/[0-9]+/g, async (match, response) => {
        let url = new URL(statics.ao3link + "/" + match.substring(4) + '/');
        funcs.debug("generated URL: " + url.toString());
        funcs.getsecpage(url, archiveofourown.error(response), (data) => {
            funcs.debug("data for series acquired");
            funcs.fullresp(response, 'text/xml', archiveofourown.series(data));
        })
    })
];

http.createServer(async function(request, response){
    funcs.debug("request: " + request.url);
    response.version = request.httpVersion;
    response.taken = false;
    if (!request.url || request.url == '/') {
        html = await filesys.readFile("info.html", {encoding: "ascii"});
        funcs.debug("served static response");
        funcs.fullresp(response, 'text/html', html);
    } else {
        for (let model of modelarr)
            model.call(request.url, response);
        if (!response.taken)
            response.writeHead(404, "Source was not found");
    }
}).listen(statics.port);