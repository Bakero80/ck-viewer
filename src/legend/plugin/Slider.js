﻿/**
 * Slider to set layer opacity. It's displayed at the layer click.
 * The opacity range begins from 0 to 100 pourcent.
 */
Ext.define('Ck.legend.plugin.Slider', {
	extend: 'Ext.AbstractPlugin',
	alias: 'plugin.legendslider',

	tipPrefix: 'Opacity',

	init: function(cmp) {
		cmp.on({
			itemclick: this.onItemmousedown,
			itemremove: this.onItemremove,
			scope: this
		});
	},
	
    // itemclick( this, record, item, index, e, eOpts )
	// rowclick( this, record, tr, rowIndex, e, eOpts )
	onItemmousedown: function(tree, record, item, index, e, eOpts ) {
		var layer = record.get('layer');

		if(layer && record.isLeaf() && !Ext.String.startsWith(e.target.className.trim(), "x-action") && !Ext.String.startsWith(e.target.className.trim(), "x-tree-checkbox")) {
			var opacity = layer.getOpacity();
			
			var slider = record.get('slider');
			if(slider && slider.getEl().dom && Ext.get(slider.getEl().dom.id)) {
				slider.setVisible(slider.hidden);
			} else {
				slider = Ext.create('Ext.slider.Single', {
					width: '90%',
					value: (opacity * 100),
					increment: 1,
					minValue: 0,
					maxValue: 100,
					renderTo: item,
					useTips: true,
					tipPrefix: this.tipPrefix,
					saveDelay: 300,
					checkChangeEvents: ["change"],
					style: {
						marginLeft: '5%',
						marginRight: '5%'
					},
					tipText: function(thumb) {
						return Ext.String.format(slider.tipPrefix + ' {0} %', thumb.value);
					},
					listeners: {
						change: function(s, v) {
							// Ck.log(v.toString());
							layer.setOpacity(v/100);
						}
					}
				});
				record.set('slider', slider);
			}
		}
	},
	
	// the Ext doc is wrong for the list params !!
	onItemremove: function(root, record) {
		// After drag&drop the slider reference is wrong, need to rebuild
		record.set('slider', false);
	}
	
});
