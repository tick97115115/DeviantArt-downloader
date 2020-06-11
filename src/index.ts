import * as http2 from "http2";
import * as fs from "fs";
import * as path from "path";


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

//deviant_art API PATH. Referrence=https://www.deviantart.com/developers/console/
const oauth2_token = '/oauth2/token'
const gallery_all = '/api/v1/oauth2/gallery/all'
const deviation_download = '/api/v1/oauth2/deviation/download'


var accessToken: any
var deviationObj: any = [] //used to store artWorks info inside


// create connection
let client = http2.connect(address)


function getAccessToken() {
    return new Promise((resolve) => {
        let frame = Buffer.from(`client_id=${client_id}&client_secret=${client_secret}&grant_type=client_credentials`)
        const head: any = {
            ':method': 'POST',
            ':path': oauth2_token,
            'Content-Type': "application/x-www-form-urlencoded",
            'Content-Length': frame.length,
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
                ':path': `${gallery_all}?username=${username}&mature_content=true&limit=${limit}&offset=${offset}&mature_content=${mature_content}`,
                ':method': 'GET',
                'Authorization': `Bearer ${accessToken}`,
            }
        }

        let head: any

        //request pool
        let requestPool = () => {
            return new Promise((res) => {
                let arr: any = [] //used to store stream frames inside
                let req = client.request(head)
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
                head = refreshHead()
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
            ':path': `${deviation_download}/${deviationId}?mature_content=true`,
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
        //deviationObj = JSON.parse(fs.readFileSync(`${__dirname}/../deviationObj.json`, {encoding: "utf-8", flag: "r"}))
        accessToken = await getAccessToken()
        await retrieveGalleryAll()
        let value: any = await getDownloadInfo()
        client.close()
        fs.writeFileSync(path.normalize(`${__dirname}/../deviationInfo.json`), JSON.stringify(value), {encoding: 'utf-8', flag: "w+"})
        let output = []
        for (const iterator of value) {
            let folder_name = iterator['filename'].split('.')[0]
            output.push(`${iterator['src']}\n  dir=${path.normalize(download_location+'/'+folder_name)}\n  out=${iterator['filename']}\n${iterator['img']}\n  dir=${path.normalize(download_location+'/'+folder_name)}`)
        }
        fs.writeFileSync(path.normalize(`${__dirname}/../aria2_input_file`), output.join('\n'), {encoding: "utf-8", flag: "w+"})
    })()
}
test_getDownloadInfo()