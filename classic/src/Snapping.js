/**
 * This panel contains tools to edit layer attributes and layer geometries
 */

Ext.define("Ck.Snapping", {
	extend: "Ext.grid.Panel",
	alias: "widget.cksnapping",
	
	controller: "cksnapping",
	
	id: "edit-snapping-options",
	
	cls: "ck-snapping",

	config:{
		tolerance: 15
	},
	
	
	columns: [{
		text		: "Layer",
		dataIndex	: "title",
		flex		: 1
	},{
		dataIndex	: "active",
		xtype		: "checkcolumn",
		width		: 40
	},{
		text		: "Tolerance",
		dataIndex	: "tolerance",
		xtype		: "widgetcolumn",
		width		: 100,
		widget		: {
			xtype		: "numberfield",
			minValue	: 1,
			maxValue	: 99,
			listeners: {
				change: function(nbField, value) {
					if (nbField.getWidgetRecord) {
						var rec = nbField.getWidgetRecord();
						if (nbField.isValid() && rec) {
							rec.set('tolerance', value);
						}
					}
				}
			}
		}
	}],
	
	enableColumnHide: false,
	enableColumnMove: false,
	enableColumnResize: false,
	sortableColumns: false,
	store: {
		fields: ["layer", "title", "active", "tolerance"]
	},
	
	// hideHeaders: true,
	
	buttons: [{
		text: "Close",
		itemId: "close"
	}]
	
});
