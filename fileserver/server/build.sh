#!/bin/sh
rm server *.o
gcc -c *.c
gcc *.o -o server
chmod a+x server