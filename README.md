# SquaredUp Community Plugins Repository

This repository contains third-party/community plugins for [SquaredUp](https://squaredup.com).

## License

[MIT](https://choosealicense.com/licenses/mit/)

## Code of Conduct

Please read and adhere to our [Code of Conduct](./CODE_OF_CONDUCT.md) document before contributing to this repo in any way.

## Introduction

Plugins are vital components of the SquaredUp Unified Observability Portal product. Each 
plugin bundles up everything involved in the interaction with a specific third party system, namely:

- The ability to import objects from an external system into the Observability Portal's Data Mesh.
- The ability to read data upon demand from an external system for displaying in dashboards and/or for use in the evaluation of monitors.

Plugins are installed into the Observability Portal product as part of the product build process managed by SquaredUp. Once installed, they appear within the Data Source Gallery in the product:

![DataSourceGallery](docs/images/DataSourceGallery.jpg)

## Execution Environments

A plugin may be executed within SquaredUp's SaaS environment or on a machine within a customer's premises (upon which the customer has installed a Relay Agent). If both environments are equally suitable for a plugin, it can
be declared as "hybrid" (in which case, two separate plugins will appear in the Data Source list, one with the label "On-Prem" added).

Javascript (NodeJS) is currently the implementation language/runtime with fullest capability, but PowerShell may be chosen for plugins which will only run On-Premise. We plan to support support other languages at some point in the future.

## Limitations

- plugin code for importing objects is limited to executing for no more than 10 minutes before being terminated; if more objects need to be imported than this time limit allows, a paging context object may be returned by the plugin to request that the plugin import code be recalled at a later date (with the same paging context object) to continue the import process. This can be repeated multiple times until all objects have been imported.
- plugin code for reading data upon demand for display in dashboards is limited to executing for no more than 6 seconds before being terminated.

## Structure of a plugin

A plugin is a directory in this repo of the form `plugins/`_plugin-name_`/v1` containing certain key files:
- `metadata.json` - a file containing high-level information about the plugin (for example: the execution location of the plugin, or the information that appears in the Data Source Gallery, above).
- `ui.json` - a file describing the configuration that must be shown to a user who is in the process of adding the plugin to their tenant to connect with an instance of the back end system.
- `custom_types.json` (Optional) - a file containing information about non-standard object types that will be imported by the plugin into the Data Mesh.
- `data_streams.json` - a file describing the streams of on demand data that the Observability Portal can request of the plugin.
- `handler.js` and `package.json` the executable code of the plugin.

## Writing a Plugin

1. **Clone the Repository:**
    First, clone the repository to your local machine:
    ```bash
    git clone https://github.com/squaredup/squaredup-plugin-public.git
    cd squaredup-plugin-public
    ```
2. **Create a New Branch:**
    You will need to create a new branch for your changes:
    ```bash
    git checkout -b add-new-plugin # Replace Branch Name
    ```
3. **Creating the Plugin Folder:**
    The suggested way to write a new plugin is to make a copy of the `examplePlugins/hybrid/v1` directory in your `plugins/`_plugin-name_`/v1` directory.
   ```bash
   # Replace 'ExamplePlugin' with your plugin name
   mkdir -p 'plugins/ExamplePlugin/v1'
   cp -r 'examplePlugins/hybrid/v1/*' 'plugins/ExamplePlugin/v1/'
   ```
4. **Tailoring the Example Plugin:**
    You will need to tailor the configuration and code to interact with the specific back end as Required.
    This process is described in more detail in [Writing a New Plugin](docs/writingANewPlugin.md).
5. **Testing the Plugin:** There are two main ways to test your plugin.
      1. Using the SquaredUp Test/Validation Script (`validate.js` at the root of this repo):
          ```bash
          npm ci
          npm run validate
          ```
      2. Using the SquaredUp Unit Test Framework which can be executed by running:
          ```bash
          npm ci
          # Replace 'ExamplePlugin' with your plugin name
          npm test -- --pluginName="ExamplePlugin" --pluginPath="plugins/ExamplePlugin/v1"
          ```
      You should aim to do as much testing as possible with the `validate.js` script as the turn-around time is much quicker.
      This process is described in more detail in [Testing a Plugin](docs/testingAPlugin.md).
6. **Installation**
    The plugin is only installed when a Pull Request has been submitted. During PR creation you will be
    asked for your Tenant (Organization) Name which can be retrieved from the [settings page](https://app.squaredup.com/settings/organization)

## Contributing

We greatly appreciate your interest in contributing to this repository! To help you get started, please take a look at our detailed contribution guidelines in the [CONTRIBUTING](CONTRIBUTING.md) document.
