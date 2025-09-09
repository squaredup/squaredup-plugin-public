# Writing a New Plugin

This guide describes how to implement a JavaScript (NodeJS) plugin using an example provided as a basis. If you need to implement an On-Premise plugin using PowerShell, contact SquaredUp for more information.

- [Example Plugin Code](#example-plugin-code)
- [Phases of Plugin Development](#phases-of-plugin-development)
- [Testing your Plugin During Development](#testing-your-plugin-during-development)
- [Standard SquaredUp `api` Functions](#standard-squaredup-api-functions)
- [Updates and Providing New Versions of Plugins](#updates-and-providing-new-versions-of-plugins)

## Example Plugin Code

The example plugin is located in this repo in the directory `examplePlugins/hybrid/v1`. You should choose a simple name for your new plugin and copy this to a new `plugins/`_plugin-name_`/v1` directory

This directory contains:

- `cspell.json` - A configuration file for the standard `cspell` npm package, in which you should list words you require not to be flagged as spelling errors.
- `custom_types.json` - A file in which you can list non-standard object types your plugin will import into the Data Mesh.
- `data_streams.json` - A file in which you list the streams of data your plugin provides to the Observability Portal product for use in dashboards and/or monitors.
- `handler.js` - The basic implementation of the plugin. _It is not expected that you should have to change the contents of this file._ All of the plugin-specific configuration and logic should be supplied elsewhere, like `handlerConfig.js` and inside the `import/` and `dataSources/` directories.
- `handlerConfig.js` - In this file, you should add configuration for your plugin and references to the code within the `import/` and `dataSources/` directories that performs the runtime operations of your plugin.
- `metadata.json` - In this file, you should declare the type of your plugin ("cloud", "onprem" or "hybrid") and supply other information, for example to appear in the Data Source Gallery in the Observability Portal product.
- `package.json` - You should change this standard `npm` package configuration file to hold information about your plugin and its dependencies.
- `ui.json` - This file defines how the Observability Portal product should prompt users to configure new instances of this plugin.
- `util.js` - A handy location for functions of use to your code in the `import/` and `dataSources/` directories.
- `importObjects/` - A directory to hold your object import code
- `readDataSource/` - A directory to hold your code for obtaining data on demand.

## Phases of Plugin Development

### Base

The first phase of developing a plugin is to write the basic JSON description of your plugin, its npm dependencies and its configuration UI. You should also write a JavaScript function to test any configuration values your users enter at run-time.

This is described in more detail in the [Writing a new Plugin - Getting Started](./newPluginBase.md) page.

### Import

Next, you need to decide which objects from your external system should be imported into the Data Mesh (e.g. for scoping tiles upon), define these objects and write the JavaScript code to import these.

This is described in more detail in the [Writing a new Plugin - Importing Objects](./newPluginImport.md) page.

### Data on Demand

Finally, you must decide what data you wish your users to be able to obtain on demand within tiles in the final dashboards and then define these and write JavaScript code to obtain the data from the external system at run-time.

This is described in more detail in the [Writing a new Plugin - Data on Demand](./newPluginDataOnDemand.md) page.

## Testing your Plugin During Development

In the early stages, you should test your progress by using the validate.js script at the root of the plugin repo as described inm the [Testing a Plugin](./testingAPlugin.md) page.

Later, you will need to commit and push your changes to the repo so that the CI/CD system at SquaredUp will deploy your latest plugin changes to the Observability Portal development environment.

## Standard SquaredUp `api` Functions

All of the JavaScript functions you write will have access to these standard SquaredUp functions via the `context` parameter passed in at run-time:

### log functions
#### `context.log.debug(msg[, obj])`

Output a trace message (only visible to SquaredUp when specially enabled for support purposes). Be liberal with calls on this!

The optional `obj` parameter will supply additional context to SquaredUp staff when investigating problems, a common calling pattern would use object construction like:
```js
    context.log.debug('Inconsistent options', { myObject1, myObject2 })
```

**Important note: never pass the `pluginConfig` object (or any of its sub-fields which are secret values like passwords) or you risk exposing customers' secrets to SquaredUp support personnel!**

#### `context.log.info(msg[, obj])`

Output a trace message (only visible to SquaredUp). Be very sparing on calls on this as it incurs run-time costs!

#### `context.log.warn(msg[, obj])`

Output a warning trace message (only visible to SquaredUp). Be very sparing on calls on this as it incurs run-time costs!

#### `context.log.error(msg[, obj])`

Output an error trace message (only visible to SquaredUp). Be very sparing on calls on this as it incurs run-time costs!

### report functions

#### `context.report.warning(msg)`

Output a warning to the end-user. e.g. in the import status for your plugin or in a tile (when called in a readDataSource function). You should use this for situations the user can and should do something about (like bad credentials, API throttling  etc.). The message should point the end-user in the right direct for addressing the issue.

#### `context.report.error(msg[, err])`

Output an error to the end-user. e.g. in the import status for your plugin or in a tile (when called in a readDataSource function). You should use this for situations the user can and should do something about (like bad credentials, API throttling  etc.). The message should point the end-user in the right direct for addressing the issue.

This call does not return, call it where you would throw an exception (but want the end user to have a friendly message explaining how to fix the problem).

### `context.patchConfig(propertyName, propertyValue, encryption)`

This call allows you to alter the value of a property in the current plugin instance's `pluginConfig` object. This could be used, for example to store a bearer token if the `pluginConfig` object contains username & password fields which can be used to obtain such a token. This would save every single call into the plugin from having to obtain a bearer token from scratch each time before making the authenticated call to obtain data.

It is recommended that a hidden UI control be added in `ui.json` file to allocate a property name in `pluginConfig` for something like this (i.e. put it inside a conditionally visible `fieldGroup` control that is never visible);

Then you can call `patchConfig()` like:
```js
    context.patchConfig('myHiddenTokenFieldName', myToken, true);
```

Of course, whenever you subsequently refer to a token (like `context.pluginConfig.myHiddenTokenField`), you would have to check for token expiry and obtain a fresh token when required.

**Important note: if you store tokens into `pluginConfig` with the `patchConfig()` function, ensure secrets are flagged for encryption otherwise you risk exposing customers' secrets to SquaredUp support staff**

## Updates and Providing New Versions of Plugins

Following the [Semantic Versioning Rules](https://semver.org/), updates to a plugin will fall into three categories:
Given a version number MAJOR.MINOR.PATCH, increment the:

1. MAJOR version when you make incompatible API changes,
2. MINOR version when you add functionality in a backwards compatible manner, and
3. PATCH version when you make backwards compatible bug fixes.

Breaking changes to a plugin (i.e., incrementing the MAJOR version) will result in a new version of that plugin being made available alongside the existing, older version. In this unlikely scenario, you should create a whole new source directory, `plugins/`_plugin-name_`/v`_N_ for each new major version.

Any changes to the MINOR or PATCH numbers will simply result in the existing plugin being upgraded/updated in-place, so care should be taken to ensure your plugin continues to work with older, existing configuration payloads being passed to your plugin handler.

## Minimal Viable Plugin
**Must**

+ Out-of-box dashboard - Dashboards created on setup Guideline for creating OOB scopes and dashboards

+ Basic Data Source

+ At least one Data Stream

+ Test configuration button

+ Handle all plugin import errors

**Should**

+ Mustache should support the standard promises

+ Use Configurable Datastreams where appropriate

+ Contain Vertices and Edges for imported objects

+ Populating Configurable Datastream with Autocomplete values

## Guidelines for plugin writing

| **Category**   | **Description**  |
| -------------- | ------------- |
| Versioning | Use patch version change for small bug fixes <br> Use minor version changes for new data streams, text changes, internal performance improvements, added paging <br> Configuration with lower version of the plugin should work with upgraded plugin to a later version (non major) <br> When a plugin change will cause a breaking change communicate this to PMs and analyse the usage of the plugin and data stream to decide how best to handle it <br> Examples of breaking changes: <br><ul><li> Use major version change for Data Stream change that makes pervious version of same Data Stream to break (but consider creating a new data stream instead, liaise with PM) </li><li> Use major version change if removing certain objects from the graph, or if moving them over into data streams as this would break tiles where they are used as scope </li></ul>
| Keywords | Include a relevant set of keywords in the metadata.json file. <br> Do not include the plugin name <br> Include relevant datastream references, e.g. BigQuery or Kusto. <br> Include related search terms, e.g. CI/CD, Database |
| Spelling | American (not British) for all UI visible information (plugin name, description, data stream names) |
| Data Stream metadata/columns | Every column should have a shape specified <br> Every column should have a name and a display name. The display name should typically be Title Case. |
| External Links | A link should be added to all imported objects to take the user to the relevant platform, e.g. the Host in the Azure Portal, via the links property on imported nodes. <br> When it makes sense, a link should be included in the datastream data too. The column must be called “Link”. |
| Timeframe | Whenever possible, all data streams should support timeframes, obeying the start/end dates included in the event. <br> Exception to the rule: data streams where it does not make sense to support a timeframe (e.g. current open alerts). Until such time that we can have a better visual cue, these data streams name should be appended with “Anytime” e.g. Open Incidents (Anytime) <br> Exception to the rule: some Health/Status data streams that show “current” data.
| Health | Whenever possible, a datastream called “Health” for each imported node type should be included. |
| Unscoped Data Streams | There must never be any unscoped data streams. |
| Nodes / Objects | Where it makes sense, a plugin should create a top-level node that represents the account/organisation/instance, e.g. Azure subscription, Github organization. <br> The platform will create a node that represents the plugin itself and edges will be added automatically to top-level nodes such as the Github organization. <br> Add a link for each object to the tool, using the “links“ property (e.g. see the Dynatrace plugin) <br> Consider normalising the casing for case insensitive properties on the imported objects to ensure that correlation can work between them |

## Dictionary
| **Word (standard display name)** | **Synonyms** |
|-------------|-----------|
| CPU | Processor <br> Memory |
| Disk | Volume
| Response Time | Response <br> HTTP Response|
| Availability | Synthetic <br> Check |
| Hosts | Server |
| Latest | Top 1 <br> Current <br> Most Recent |
| Status | State <br> Health |
