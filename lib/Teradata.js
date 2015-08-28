var Promise = require("bluebird");
var chalksay = require('chalksay');
var jdbc = require('jdbc');
var jinst = require('jdbc/lib/jinst');

var DEFAULT_FETCH_SIZE = 100;

var teradataInstance;
var teradataConfig = {properties: {}};
var tdConn;

function createPromisedStatement(query) {
    return tdConn.conn.createStatementAsync()
        .then(function (statement) {
            queryStatement = Promise.promisifyAll(statement);
            return queryStatement;
        })
}
Teradata = {
    connect: function (url, user, password) {
        //config using user settings
        teradataConfig.url = url;
        teradataConfig.properties.user = user;
        teradataConfig.properties.password = password;

        //add jars to classpath
        if (!jinst.isJvmCreated()) {
            jinst.addOption("-Xrs");
            jinst.setupClasspath([
                './jar/terajdbc4.jar',
                './jar/tdgssconfig.jar'
            ]);
        }

        //init jvm and reserve teradata connection
        teradataInstance = Promise.promisifyAll(new jdbc(teradataConfig));

        return teradataInstance.initializeAsync()
            .then(function () {
                chalksay.green("Succesfully initialized Teradata connection to %s ", teradataConfig.url);
                return teradataInstance.reserveAsync();
            })
            .then(function (teradataConnection) {
                chalksay.green("Teradata connected and ready for queries");
                tdConn = teradataConnection;
                Promise.promisifyAll(tdConn.conn);
                return teradataConnection;
            })
    },

    disconnect: function () {
        return teradataInstance.releaseAsync(tdConn)
            .then(function () {
                chalksay.green("Teradata database disconnected");
            });
    },

    executeQuery: function (query, fetchSize) {
        var queryFetchSize = fetchSize ? fetchSize : DEFAULT_FETCH_SIZE;
        var queryStatement;
        return createPromisedStatement(query)
            .then(function (statement) {
                queryStatement = Promise.promisifyAll(statement);
                return queryStatement.setFetchSizeAsync(queryFetchSize);
            })
            .then(function () {
                return queryStatement.executeQueryAsync(query);
            })
            .then(function (resultSet) {
                var asyncResultSet = Promise.promisifyAll(resultSet);
                return asyncResultSet.toObjArrayAsync();
            })
            .then(function (resultSetArray) {
                console.log(resultSetArray);
                return resultSetArray;
            })
    },

    executeUpdate: function (query) {
        var updateStatement;
        return createPromisedStatement(query)
            .then(function (promisedStatement) {
                return promisedStatement.executeUpdateAsync(query);
            })
            .then(function (updateCount) {
                return updateCount;
            })
    }
};

module.exports = Teradata;