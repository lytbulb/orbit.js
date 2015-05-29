import OC from 'orbit-common/main';
import { Class, isArray, isObject, isNone } from 'orbit/lib/objects';
import OperationEncoder from 'orbit-common/operation-encoder';

export default Class.extend({
  init: function(schema, cache){
    this._schema = schema;
    this._cache = cache;
    this._operationEncoder = new OperationEncoder(schema);
  },

  process: function(operation, condemnedPaths) {
    var _this = this;
    condemnedPaths = condemnedPaths || [];
    var path = operation.path;
    var value = operation.value;
    var type = path[0];
    var schema = this._schema;
    var operationType = this._operationEncoder.identify(operation);

    function relatedLinkOps(linkValue, linkDef){
      linkDef = linkDef || schema.linkDefinition(type, path[3]);
      var op = operation.op;
      var ignoredPaths = op === 'remove' ? condemnedPaths : [];
      return _this._relatedLinkOps(linkDef, linkValue, path[1], operation, ignoredPaths);
    }

    function addRelatedLinksOpsForRecord(record){
      if (!record.__rel) return;
      var linkDef;
      var ops = [];

      Object.keys(record.__rel).forEach(function(link) {
        linkDef = schema.linkDefinition(type, link);

        if (linkDef.inverse) {
          var linkValue = linkDef.type === 'hasMany' ? Object.keys(record.__rel[link]) : record.__rel[link];
          var linkOps = relatedLinkOps(linkValue, linkDef);

          for(var i = 0; i < linkOps.length; i++){
            ops.push(linkOps[i]);
          }
        }
      });

      return ops;
    }

    function removeRelatedLinksOpsForRecord(record){
      if (!record.__rel) return [];
      var linkDef;
      var ops = [];

      Object.keys(record.__rel).forEach(function(link) {
        linkDef = schema.linkDefinition(type, link);

        if (linkDef.inverse) {
          var linkValue = linkDef.type === 'hasMany' ? Object.keys(record.__rel[link]) : record.__rel[link];
          var linkOps = relatedLinkOps(linkValue, linkDef);

          for(var i = 0; i < linkOps.length; i++){
            ops.push(linkOps[i]);
          }
        }
      });

      return ops;
    }

    switch (operationType) {
      case 'addHasOne': return relatedLinkOps(value);
      case 'replaceHasOne': return relatedLinkOps(value);
      case 'removeHasOne': return relatedLinkOps(this._retrieve(path));

      case 'addHasMany': return relatedLinkOps(Object.keys(operation.value));
      case 'replaceHasMany': return relatedLinkOps(Object.keys(operation.value));
      case 'removeHasMany': return relatedLinkOps(Object.keys(this._retrieve(path)));
      case 'addToHasMany': return relatedLinkOps(path[4]);
      case 'removeFromHasMany': return relatedLinkOps(path[4]);

      case 'addRecord': return addRelatedLinksOpsForRecord(value);
      case 'removeRecord': return removeRelatedLinksOpsForRecord(this._retrieve(path));

      default: return [];
    }
  },

  _relatedLinkOps: function(linkDef, linkValue, value, parentOperation, ignoredPaths){
    if(isNone(linkValue)) return [];
    var relIds = isArray(linkValue) ? linkValue : [linkValue];
    var linkOps = [];
    var linkOp;

    if (linkDef.inverse) {
      var relatedOp = this._relatedOp(parentOperation.op, linkDef);
      for(var i = 0; i < relIds.length; i++){
        linkOp = this._relatedLinkOp(linkDef.model, relIds[i], linkDef.inverse, value, parentOperation, relatedOp, ignoredPaths);
        if(linkOp) linkOps.push(linkOp);
      }
    }

    return linkOps;
  },

  _relatedOp: function(op, linkDef){
    var relatedLinkDef = this._schema.linkDefinition(linkDef.model, linkDef.inverse);
    if(relatedLinkDef.type === 'hasMany' && op === 'replace') return 'add';
    return op;
  },

  _relatedLinkOp: function(type, id, link, value, parentOperation, relatedOp, ignoredPaths){
    if (this._retrieve([type, id])) {

      if(!this._cache.isLinkInitialized(type, id, link)) return;

      var operation = this._operationEncoder.linkOp(relatedOp, type, id, link, value);
      var path = operation.path.join("/");
      var isIgnoredPath = ignoredPaths.indexOf(path) > -1;

      // Apply operation only if necessary
      if (this._retrieve(operation.path) !== operation.value && !isIgnoredPath) {
        return parentOperation.spawn(operation);
      }
    }
  },

  _retrieve: function(path){
    return this._cache.retrieve(path);
  }
});
