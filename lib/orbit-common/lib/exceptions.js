
import { Exception } from 'orbit/lib/exceptions';
/**
 @module orbit-common
 */

/**
 Exception thrown when an operation is not allowed.

 @class OperationNotAllowed
 @namespace OC
 @param {Object} description
 @constructor
 */
var OperationNotAllowed = Exception.extend({
  name: 'OC.OperationNotAllowed',
  init: function(message, operation) {
    this.operation = operation;
    this._super(message);
  }
});

var ModelNotRegisteredException = Exception.extend({
  name: 'OC.ModelNotRegisteredException',
  init: function(model) {
    this.model = model;
    this._super('model "' + model + '" not found');
  },
});

var LinkNotRegisteredException = Exception.extend({
  name: 'OC.LinkNotRegisteredException',
  init: function(model, link) {
    this.model = model;
    this.link = link;
    this._super('link "' + model + "#" + link + '" not registered');
  },
});


var _RecordException = Exception.extend({
  init: function(type, record, key) {
    this.type = type;
    this.record = record;
    var message = type + '/' + record;

    if (key) {
      this.key = key;
      message += '/' + key;
    }
    this._super(message);
  },
});

/**
 Exception thrown when a record can not be found.

 @class RecordNotFoundException
 @namespace OC
 @param {String} type
 @param {Object} record
 @constructor
 */
var RecordNotFoundException = _RecordException.extend({
  name: 'OC.RecordNotFoundException',
});

/**
 Exception thrown when accessing a link that hasn't been loaded yet.

 @class LinkNotFoundException
 @namespace OC
 @param {String} type
 @param {String} link
 @constructor
 */
var LinkNotInitializedException = Exception.extend({
  name: 'OC.LinkNotInitializedException',
  init: function(type, id, link){
    this.type = type;
    this.link = link;
    this._super('link "' + [type, id, link].join("/") + '" not loaded');
  }
});

/**
 Exception thrown when a record already exists.

 @class RecordAlreadyExistsException
 @namespace OC
 @param {String} type
 @param {Object} record
 @constructor
 */
var RecordAlreadyExistsException = _RecordException.extend({
  name: 'OC.RecordAlreadyExistsException',
});

export { OperationNotAllowed, RecordNotFoundException, LinkNotInitializedException, RecordAlreadyExistsException, ModelNotRegisteredException, LinkNotRegisteredException };
