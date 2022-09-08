const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const envKeys = Object.keys(process.env).reduce((prev, next) => {
  prev[`process.env.${next}`] = JSON.stringify(process.env[next]);
  return prev;
}, {});

const config = {
  entry: {
    background: './src/background.ts',
    // TODO add more pages as required here
    // 'annotation-event-trigger': './src/annotation-event-trigger.ts',
    // 'audio-permission': './src/audio-permission.ts',
    // inject: './src/inject/index.tsx',
    // 'browser-action-popup': './src/pages/BrowserActionPopup.tsx',
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /(node_modules)/,
        loader: 'babel-loader',
        options: { presets: ['@babel/env'] },
      },
      {
        test: /\.(ts|tsx)$/,
        exclude: /(node_modules)/,
        use: [
          {
            loader: 'babel-loader',
            options: { presets: ['@babel/env'] },
          },
          {
            loader: 'ts-loader',
          },
        ],
      },
      {
        test: /\.(scss|css)$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
          },
          'css-loader',
          'sass-loader',
        ],
      },
    ],
  },
  resolve: { extensions: ['.ts', '.tsx', '.js', '.jsx'] },
  output: {
    path: path.resolve(__dirname, 'build/'),
    filename: '[name].js',
  },
  plugins: [
    new CopyPlugin([{ from: 'public', to: './' }]),
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
    new webpack.DefinePlugin(envKeys),
  ],
};

if (process.env.NODE_ENV === 'production') {
  config.mode = 'production';
} else {
  config.mode = 'development';
  config.devtool = 'inline-source-map';
}

module.exports = config;
