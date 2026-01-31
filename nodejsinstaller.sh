wget https://nodejs.org/dist/v24.13.0/node-v24.13.0-linux-x64.tar.xz
mv node-* ~/
cd ..
tar -xf node-*
rm node-v24.13.0-linux-x64.tar.xz
sudo mv node-v24.13.0-linux-x64 /usr/local/node
echo 'export PATH=/usr/local/node/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
echo
echo
echo
echo
echo
node -v
npm -v
