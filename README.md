# DeviantArt Downloader

## Example
node (program root path)/build/index.js --author Shuubaru -p C:/Users/APboi/Desktop -n tamaki

aria2c -i (program root path)/aria2_input_file #this was unnecessary, because program will spown a sub process to start it.

This program will make an "aria2_input_file" at program root directory.
That was used to read by aria2 for batch download.

        [OPTIONS]                               [Description]
        --author[args]                          determine who is the author of that products you want to download.
        -p[args]                                determine what's the location you want to store that all of products data.
        -n[args]                                determine waht's the product's name of you want to download,or you can just enter the key word that product's name containing.
        --all                                   download all of products of that author you specified.

