import OC from 'orbit-common/main';
import { Class, isArray, isObject, isNone } from 'orbit/lib/objects';

export default Class.extend({
  init: function(schema, cache) {
    this._schema = schema;
    this._cache = cache;
  },

  process: function(operation) {
    var _this = this;
    var path = operation.path;
    var value = operation.value;
    var type = path[0];
    var schema = this._schema;
    var operationType = this._schema.operationEncoder.identify(operation);

    function relatedLinkOps(linkValue, linkDef) {
      linkDef = linkDef || schema.linkDefinition(type, path[3]);
      var op = operation.op;
      return _this._relatedLinkOps(linkDef, linkValue, path[1], operation);
    }

    function relatedHasManyOps(linkValue){
      if(linkValue === OC.LINK_NOT_INITIALIZED) return [];
      return relatedLinkOps(Object.keys(linkValue));
    }

    function relatedHasOneOps(linkValue){
      if(linkValue === OC.LINK_NOT_INITIALIZED) return [];
      return relatedLinkOps(linkValue);
    }

    function relatedLinksOpsForRecord(record){
      if (!record || !record.__rel) return [];
      var linkDef;
      var ops = [];

      Object.keys(record.__rel).forEach(function(link) {
        linkDef = schema.linkDefinition(type, link);
        var linkValue = record.__rel[link];

        if (linkDef.inverse && linkValue !== OC.LINK_NOT_INITIALIZED) {
          var relIds = linkDef.type === 'hasMany' ? Object.keys(linkValue||{}) : linkValue;
          var linkOps = relatedLinkOps(relIds, linkDef);

          for(var i = 0; i < linkOps.length; i++) {
            ops.push(linkOps[i]);
          }
        }
      });

      return ops;
    }

    switch (operationType) {
      case 'addHasOne': return relatedHasOneOps(value);
      case 'replaceHasOne': return relatedHasOneOps(value);
      case 'removeHasOne': return relatedHasOneOps(this._retrieve(path));

      case 'addHasMany': return relatedHasManyOps(operation.value);
      case 'replaceHasMany': return relatedHasManyOps(operation.value);
      case 'removeHasMany': return relatedHasManyOps(this._retrieve(path));
      case 'addToHasMany': return relatedHasOneOps(path[4]);
      case 'removeFromHasMany': return relatedHasOneOps(path[4]);

      case 'addRecord': return relatedLinksOpsForRecord(value);
      case 'removeRecord': return relatedLinksOpsForRecord(this._retrieve(path));

      default: return [];
    }
  },

  _relatedLinkOps: function(linkDef, linkValue, value, parentOperation) {
    if (isNone(linkValue)) return [];
    var relIds = isArray(linkValue) ? linkValue : [linkValue];
    var linkOps = [];
    var linkOp;

    if (linkDef.inverse) {
      var relatedOp = this._relatedOp(parentOperation.op, linkDef);
       for (var i = 0; i < relIds.length; i++) {
        linkOp = this._relatedLinkOp(linkDef.model, relIds[i], linkDef.inverse, value, parentOperation, relatedOp);
        if (linkOp) linkOps.push(linkOp);
      }
    }

    return linkOps;
  },

  _relatedOp: function(op, linkDef) {
    var relatedLinkDef = this._schema.linkDefinition(linkDef.model, linkDef.inverse);
    if (relatedLinkDef.type === 'hasMany' && op === 'replace') return 'add';
    return op;
  },

  _relatedLinkOp: function(type, id, link, value, parentOperation, relatedOp) {
    if (this._retrieve([type, id])) {
      var operation = this._schema.operationEncoder.linkOp(relatedOp, type, id, link, value);
      var path = operation.path.join("/");

      // Apply operation only if necessary
      if (this._retrieve(operation.path) !== operation.value) {
        return parentOperation.spawn(operation);
      }
    }
  },

  _retrieve: function(path) {
    return this._cache.retrieve(path);
  }
});
