const path = require('path');
const fs = require('fs');
const baseDir = fs.realpathSync(process.cwd());
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
    entry: path.resolve(baseDir, 'src/app.js'),
    mode: 'development',
    devServer: {
        host: '0.0.0.0',
        port: 8080,
        contentBase: path.resolve(baseDir, 'public'),
        publicPath: '/',
    },
    module: {
        rules: []
    },
    plugins: [
        new HtmlWebpackPlugin({
            inject: true, // inject to index.html
            template: path.resolve(baseDir, 'public/index.html'),
        }),
        new CleanWebpackPlugin(),
    ]
}