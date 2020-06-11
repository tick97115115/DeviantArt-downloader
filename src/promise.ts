function return_a() {
    return new Promise ((resolve) => {
        resolve('a')
    })
}

function return_b() {
    return new Promise((resolve) => {
        resolve('b')
    })
}

(async () => {
    let a = await return_a()
    console.log(a)
    let b = await return_b()
    console.log(b)
})();