import * as http2 from "http2";
import * as fs from "fs";
import * as path from "path";
import * as minimist from "minimist";
import * as process from "process";
import * as child_process from "child_process";


const address = 'https://www.deviantart.com'
const client_id = "12464"
const client_secret = "22d53ed21c806257479ee557ab52e083"

// used by function retrieveGalleryAll()
var username: string = "Shuubaru"
var limit: number = 24
var offset: number = 0
var mature_content: boolean = true  //R18 option
var download_location: string = path.normalize(`${__dirname}/../download`)
var product_name: string = 'tamaki'//represent the name of you wanted products


var accessToken: any
var deviationObj: any = [] //used to store artWorks info inside


// create connection
let client = http2.connect(address)


function getAccessToken() {
    return new Promise((resolve) => {
        let frame = Buffer.from(`client_id=${client_id}&client_secret=${client_secret}&grant_type=client_credentials`)
        const head: any = {
            ':method': 'POST',
            ':path': '/oauth2/token',
            'Content-Type': "application/x-www-form-urlencoded",
        }
    
        let req = client.request(head)
    
        let arr: any = []//used to store datagrams
        req.on('data', (chunk) => {
            arr.push(chunk)
        })

        req.on('end', () => {
            let result = JSON.parse(Buffer.concat(arr).toString())//response data format like: {"access_token":"c7c70bc711f1b499fcacff660eb2557fc27d2a66c2f6402975","token_type":"Bearer","expires_in":3600,"status":"success"}
            resolve(result['access_token'])
        })
        req.write(frame)
        req.end()
    })
}
function test_getAccessToken() {
    (async () => {
        console.log(await getAccessToken())
        client.close()
    })()
}


function retrieveGalleryAll() {
    return new Promise((resolve) => {

        let refreshHead = () => {
            return {
                ':path': `/api/v1/oauth2/gallery/all?username=${username}&mature_content=true&limit=${limit}&offset=${offset}&mature_content=${mature_content}`,
                ':method': 'GET',
                'Authorization': `Bearer ${accessToken}`,
            }
        }

        //request pool
        let requestPool = () => {
            return new Promise((res) => {
                let arr: any = [] //used to store stream frames inside
                let req = client.request(refreshHead())
                req.on('data', (chunk) => {
                    arr.push(chunk)
                })
                req.on('end', () => {
                    let response: any = JSON.parse(Buffer.concat(arr).toString())
                    res(response)
                })
                req.end()
            })
        }

        let result: any
        (async () => {
            do {
                result = await requestPool()

                if (result.hasOwnProperty('error')) {
                    accessToken = await getAccessToken()
                    result = await requestPool()
                    for (const key in result['results']) {
                        deviationObj.push(result['results'][key])
                    }
                } else {
                    for (const key in result['results']) {
                        deviationObj.push(result['results'][key])
                    }
                }
                offset = result['next_offset']
            } while (result['has_more'] === true);
            resolve()
        })()
    })
}
function test_retrieveGalleryAll() {
    (async () => {
        accessToken = await getAccessToken()
        await retrieveGalleryAll()
        fs.writeFileSync(path.normalize(`${__dirname}/../deviationObj.json`), deviationObj.toString(), {flag: "w+"})
        client.close()
    })()
}


function getDownloadInfo() {
    function refreshHead(deviationId: string) {
        return {
            ':method': "GET",
            ':path': `/api/v1/oauth2/deviation/download/${deviationId}?mature_content=true`,
            'Authorization': `Bearer ${accessToken}`
        }
    }
    function requestPool(deviationId: string) {
        return new Promise((res) => {
            (async() => {accessToken = await getAccessToken()})();
            let arr: any = []
            let req = client.request(refreshHead(deviationId))
            req.on('data', (chunk) => {
                arr.push(chunk)
            })
            req.on('end', () => {
                let response = JSON.parse(Buffer.concat(arr).toString())
                res(response)//{src (string), filename (string), width (integer), height (integer), filesize (integer)}
            })
            req.end()
        })
    }
    return new Promise((resolve) => {
        (async () => {
            let list: any = []
            for (const iterator of deviationObj) {
                if (iterator['title'].toLowerCase().indexOf(product_name) !== -1) {
                    console.log(`add matched product: ${iterator['title']}`)
                    let response: any = await requestPool(iterator['deviationid'])
                    if (response.hasOwnProperty('error')) {
                        accessToken = await getAccessToken()
                        list.push({'deviationid': iterator['deviationid'], 'img': iterator['content']['src'], 'src': response['src'], 'filename': response['filename']})
                    } else {
                        list.push({'deviationid': iterator['deviationid'], 'img': iterator['content']['src'], 'src': response['src'], 'filename': response['filename']})
                    }
                }
            }
            resolve(list)
        })();
    })
}
function test_getDownloadInfo() {
    (async () => {
        try {
            accessToken = await getAccessToken()
            await retrieveGalleryAll()
            let value: any = await getDownloadInfo()
            fs.writeFileSync(path.normalize(`${__dirname}/../deviationInfo.json`), JSON.stringify(value), {encoding: 'utf-8', flag: "w+"})
            let output = []
            for (const iterator of value) {
                let folder_name = iterator['filename'].split('.')[0]
                output.push(`${iterator['src']}\n  dir=${path.normalize(download_location+'/'+folder_name)}\n  out=${iterator['filename']}\n${iterator['img']}\n  dir=${path.normalize(download_location+'/'+folder_name)}`)
            }
            fs.writeFileSync(path.normalize(`${__dirname}/../aria2_input_file`), output.join('\n'), {encoding: "utf-8", flag: "w+"})
        } catch (error) {
            throw error
        } finally {
            client.close()
        }
    })()
}
//test_getDownloadInfo()


function getAllDownloadInfo() {
    function refreshHead(deviationId: string) {
        return {
            ':method': "GET",
            ':path': `/api/v1/oauth2/deviation/download/${deviationId}?mature_content=true`,
            'Authorization': `Bearer ${accessToken}`
        }
    }
    function requestPool(deviationId: string) {
        return new Promise((res) => {
            (async() => {accessToken = await getAccessToken()})();
            let arr: any = []
            let req = client.request(refreshHead(deviationId))
            req.on('data', (chunk) => {
                arr.push(chunk)
            })
            req.on('end', () => {
                let response = JSON.parse(Buffer.concat(arr).toString())
                res(response)//{src (string), filename (string), width (integer), height (integer), filesize (integer)}
            })
            req.end()
        })
    }
    return new Promise((resolve) => {
        (async () => {
            let list: any = []
            for (const iterator of deviationObj) {
                let response: any = await requestPool(iterator['deviationid'])
                if (response.hasOwnProperty('error')) {
                    accessToken = await getAccessToken()
                    list.push({'deviationid': iterator['deviationid'], 'img': iterator['content']['src'], 'src': response['src'], 'filename': response['filename']})
                } else {
                    list.push({'deviationid': iterator['deviationid'], 'img': iterator['content']['src'], 'src': response['src'], 'filename': response['filename']})
                }
            }
            resolve(list)
        })();
    })
}

/*  ATTENTION, the DeviantArt API "/api/v1/oauth2/user/whois" can't fetch any UserInfo, I was make a Issue to Github repository of the DeviantArt's offical API repository.
function checkUserExist() {
    return new Promise((resolve,reject) => {
        function refreshHead() {
            return {
                ':method': 'POST',
                ':path': '/api/v1/oauth2/user/whois',
                'Content-Type': "application/x-www-form-urlencoded",
                //'Authorization': `Bearer ${accessToken}`,
            }
        }
        function requestPool() {
            return new Promise((res) => {
                let req = client.request(refreshHead())
                let arr: any = []
                req.on('data', (chunk) => {
                    arr.push(chunk)
                })
                req.on('end', () => {
                    let data = JSON.parse(Buffer.concat(arr).toString())
                    res(data)
                })
                req.write(`access_token=${accessToken}&usernames=['${username}']`)
                req.end()
            })
        }
        
        (async () => {
            let data:any = await requestPool()
            if (data.hasOwnProperty('error')) {
                reject(data)
            } else {
                resolve(data)
            }
        })()
    })
}
function test_checkUserExist() {
    (async () => {
        try {
            accessToken = await getAccessToken()
            console.log(accessToken)
            await checkUserExist()
            .then((res) => {
                console.log(res)
            })
            .catch((rej) => {
                console.log(rej)
            })
        } catch (error) {
            throw error
        } finally {
            client.close()
        }
    })()
}
test_checkUserExist()
//test_getAccessToken()
*/


function getUserProfile() {
    return new Promise((resolve, reject) => {
        function refreshHead() {
            return {
                ':method': 'GET',
                ':path': `/api/v1/oauth2/user/profile/${username}?ext_collections=true&ext_galleries=true&mature_content=true`,
                'Authorization': `Bearer ${accessToken}`
            }
        }
    
        function requestPool() {
            return new Promise((res) => {
                let req = client.request(refreshHead())
                let arr: any = []
                req.on('data', (chunk) => {
                    arr.push(chunk)
                })
                req.on('end', () => {
                    let data = JSON.parse(Buffer.concat(arr).toString())
                    res(data)
                })
                req.end()
            })
        }
    
        (async () => {
            let result:any = await requestPool()
            if (result.hasOwnProperty('error')) {
                reject(result)
            } else {
                resolve(result)
            }
        })()
    })
}
function test_getUserProfile() {
    (async () => {
        try {
            accessToken = await getAccessToken()
            console.log(accessToken)
            await getUserProfile()
            .then((value) => {
                console.log(value)
            })
            .catch((value) => {
                console.log(value)
            })
        } catch (error) {
            throw error
        } finally {
            client.close()
        }
    })()
}
//test_getUserProfile()


function aria2_download() {
    const ls = child_process.spawn('aria2c', ['-i',path.normalize(`${__dirname}/../aria2_input_file`)]);
    ls.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });
      
    ls.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });
      
    ls.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
    });
}


//main

function main() {
    let parseArgs = minimist.default(process.argv.slice(2))
    if (parseArgs.hasOwnProperty('h') || parseArgs.hasOwnProperty('help')) {
        console.log(`
node (program root path)/build/index.js [OPTIONS] [Args]

Example:
node (program root path)/build/index.js --author Shuubaru -p C:/Users/APboi/Desktop -n tamaki
aria2c -i (program root path)/aria2_input_file #this was unnecessary, because program will spown a sub process to start it.

This program will make an "aria2_input_file" at program root directory.
That was used to read by aria2 for batch download.

        [OPTIONS]                               [Description]
        --author[args]                          determine who is the author of that products you want to download.
        -p[args]                                determine what's the location you want to store that all of products data.
        -n[args]                                determine waht's the product's name of you want to download,or you can just enter the key word that product's name containing.
        --all                                   download all of products of that author you specified.
        `.slice(1))
        process.exit(0)
    }
    //check is that author exist.
    if (parseArgs.hasOwnProperty('author')) {
        username = parseArgs['author'];
        (async () => {
            accessToken = await getAccessToken()
            await getUserProfile().then((res: any) => {
                console.log('Author detected')
                console.log(`${username} have ${res['stats']['user_deviations']} products.`)
            }).catch((rej) => {
                client.close()
                throw new Error(rej['error_description'])
            })
        })()
    } else {
        throw new Error(`please ensure that your target author.`)
    }
    //Specify a download location. Otherwise downlaod to the default location: "(program_folder)/download"
    if (parseArgs.hasOwnProperty('p')) {
        download_location = path.normalize(parseArgs['p'])
    }
    //specify the product name to batch download, otherwise download all product of specific author.
    if (parseArgs.hasOwnProperty('n') && parseArgs['n'] !== true) {//if have not any argument following OPTION, the OPTION's value will be true. 
        product_name = parseArgs['n'];
        (async () => {
            try {
                accessToken = await getAccessToken()
                await retrieveGalleryAll()
                let value: any = await getDownloadInfo()
                fs.writeFileSync(path.normalize(`${__dirname}/../deviationInfo.json`), JSON.stringify(value), {encoding: 'utf-8', flag: "w+"})
                let output = []
                for (const iterator of value) {
                    let folder_name = iterator['filename'].split('.')[0]
                    output.push(`${iterator['src']}\n  dir=${path.normalize(download_location+'/'+folder_name)}\n  out=${iterator['filename']}\n${iterator['img']}\n  dir=${path.normalize(download_location+'/'+folder_name)}`)
                }
                fs.writeFileSync(path.normalize(`${__dirname}/../aria2_input_file`), output.join('\n'), {encoding: "utf-8", flag: "w+"})
                aria2_download()
            } catch (error) {
                throw error
            } finally {
                client.close()
            }
        })()
    } else if (parseArgs.hasOwnProperty('all')) {//download all content
        (async () => {
            try {
                accessToken = getAccessToken()
                await retrieveGalleryAll()
                let value: any = await getAllDownloadInfo()
                fs.writeFileSync(path.normalize(`${__dirname}/../deviationInfo.json`), JSON.stringify(value), {encoding: 'utf-8', flag: "w+"})
                let output = []
                for (const iterator of value) {
                    let folder_name = iterator['filename'].split('.')[0]
                    output.push(`${iterator['src']}\n  dir=${path.normalize(download_location+'/'+folder_name)}\n  out=${iterator['filename']}\n${iterator['img']}\n  dir=${path.normalize(download_location+'/'+folder_name)}`)
                }
                fs.writeFileSync(path.normalize(`${__dirname}/../aria2_input_file`), output.join('\n'), {encoding: "utf-8", flag: "w+"})
                aria2_download()
            } catch (error) {
                throw error
            } finally {
                client.close()
            }
        })()
    } else {
        console.log(`please ensure what name of products you want to download`)
    }
}
main()