const path = require('path');
const fs = require('fs');
const baseDir = fs.realpathSync(process.cwd());
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    mode: 'production',
    entry: path.resolve(baseDir, 'src/app.js'),
    output: {
        publicPath: '/cg-final-project/'
    },
    plugins: [
        new HtmlWebpackPlugin({
            inject: true, // inject to index.html
            template: path.resolve(baseDir, 'public/index.html'),
        }),
        new CleanWebpackPlugin(),
        new CopyWebpackPlugin({
            patterns: [
                {from:'public/assets', to: 'assets'},
                {from:'public/models', to: 'models'},
                {from:'public/textures', to: 'textures'}
            ]
        }),
    ]
}