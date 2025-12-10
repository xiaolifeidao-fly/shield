#!/bin/sh
tar -czvf shield.tar.gz --exclude=node_modules --exclude=.next --exclude=nohup.out *
mkdir .build
cp shield.tar.gz .build