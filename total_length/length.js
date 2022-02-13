const songext = /\.mp3$/;
const fs = require('fs');
const path = require('path');
const mp3dur = require('get-mp3-duration');

/**
 * Explores recursively a directory and returns all the filepaths and
 * folderpaths in the callback.
 * 
 * @see http://stackoverflow.com/a/5827895/4241030
 * @param {String} dir 
 * @param {Function} done 
 */
function filewalker(dir, done) {
    let results = [];

    fs.readdir(dir, function(err, list) {
        if (err) return done(err);

        var pending = list.length;

        if (!pending) return done(null, results);

        list.forEach(function(file){
            file = path.resolve(dir, file);

            fs.stat(file, function(err, stat){
                // If directory, execute a recursive call
                if (stat && stat.isDirectory()) {
                    // Add directory to array [comment if you need to
                    // remove the directories from the array]
                    // results.push(file);

                    filewalker(file, function(err, res){
                        results = results.concat(res);
                        if (!--pending) done(null, results);
                    });
                } else {
                    results.push(file);

                    if (!--pending) done(null, results);
                }
            });
        });
    });
}

function convertMSToTime(ms) {
    let units = {day: 864e5, hour: 36e5, minute: 6e4, second: 1e3};
    let str = Object.entries(units).reduce((r, [unit, multi]) => {
        if (ms >= multi) {
            let count = ms / multi | 0;
            let tail = count > 1 ? 's' : '';
            r.push([count, unit + tail]);
            ms = ms % multi;
        }
        return r;
    }, []);
    return str.flat().join(" ");
}

function main() {
    let folder = process.argv[2];
    if (!folder) {
        console.log("Feed root folder for file search as script parameter!");
        return;
    }
    filewalker(folder, (err, data) => {
        if (err) throw err;
        let songs = data.filter((file) => songext.test(file));
        let target = {remaining: songs.length, sum: 0};
        for (let song of songs) {
            console.log("Starting ops on file " + song);
            let buffer = fs.readFileSync(song);
            target.sum += mp3dur(buffer);
            target.remaining--;
        }
        console.log("Total time: " + convertMSToTime(target.sum));
    });
}

main();