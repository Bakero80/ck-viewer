/**
 * @private
 * Plugin to associate to a grid on a form.
 */
Ext.define('Ck.form.plugin.Subform', {
	extend: 'Ext.AbstractPlugin',
	alias: 'plugin.gridsubform',

	/**
	 * Save the entire grid when add/edit/delete row. Used when subform have no dataUrl.
	 */
	autocommit: false,
	
	/**
	 * Save when update row with rowediting plugin
	 */
	commitrow: false,

	/**
	 * Number of click needed to start editing by openning pop-up
	 */	
	clicksToEdit: 1,

	/**
	 * Include "Add" button to add a row
	 */
	addbutton: true,

	/**
	 * Text of the "Add" button
	 */
	addbuttonText: 'Add',

	/**
	 * Enable single click to start live edition (without pop-up)
	 */
	editrow: true,
	
	/**
	 * Object with "property" and "value" member to define row without edit button
	 */
	disableEditRow: null,

	/**
	 * Add deletion button column
	 */
	deleterow: true,

	/**
	 * Object with "property" and "value" member to define row without delete button
	 */
	disableDeleteRow: null,

	/**
	 * True to insert new item at last. False to insert the item first
	 */
	addItemLast: true,

	/**
	 * The pop-up
	 * @var {Ext.window.Window}
	 */
	_subformWindow: null,

	/**
	 * The subform
	 * @var {Ck.Form}
	 */
	_subform: null,

	/**
	 * The associated grid
	 * @var {Ext.grid.Panel}
	 */
	_grid: null,

	/**
	 * Init the plugin
	 * @param {Ext.grid.Panel} The associated grid
	 */
	init: function(grid) {
		if(!grid.subform) return;

		// Accept param as String or Object
		if(Ext.isString(grid.subform)) {
			grid.subform = {
				url : grid.subform
			};
		}

		// Update internal counter to check when all subforms are loaded.
		// Add extra count to pass the delay:50 of initSubForm only when form is visible so grid will be rendered
		var formController = grid.lookupController();
		if(formController.getView().isVisible()){
			formController.rootForm.processingForm++;
			formController.rootForm.processingData++;
			// Ck.log("Init subForm : "+ grid.subform.url + " (stack " +formController.rootForm.processingForm+")");
		}
		
		if(this.autocommit===true) this.commitrow=true;
		
		// Init subform after grid rendering
		grid.on('afterrender', function() {
			this.initSubForm(grid);
		}, this, {delay: 50});
	},

	/**
	 * @private
	 * Component calls destroy on all its plugins at destroy time.
	 */
	destroy: function() {
		if(this._subformWindow) this._subformWindow.destroy();
	},

	/**
	 * Called on "afterrender" grid event
	 * @param {Ext.grid.Panel}
	 */
	initSubForm: function(grid) {
		this._grid = grid;
		var subForm = grid.subform;

		var formController = grid.lookupController();
		
		// Remove extra count to pass the delay:50 of initSubForm
		formController.rootForm.processingForm--;
		formController.rootForm.processingData--;
		// Ck.log("Init subForm 2 : "+ grid.subform.url + " (stack " +formController.rootForm.processingForm+")");
		
		var cssSuffix = grid.reference || formController.name;
		
		// Can't create subform instance here. Need to add in page first, to get viewModel hierarchy
		this._subform = {
			xtype: 'ckform',
			itemId: 'subform',
			isSubForm: true,
			
			// load from grid selection row
			autoLoad: false,
			editing: subForm.editing || formController.getView().getEditing(),
			urlTemplate: subForm.urlTemplate || formController.getView().getUrlTemplate(),
			// inherit dataFid from main form (used in store url template)
			dataFid:  formController.getView().getDataFid(),

			dataModel: subForm.dataModel,

			// TODO use param from json
			layout: subForm.layout || '',
			scrollable: subForm.scrollable || 'y',

			formName: '/' + subForm.url,
			layer: grid.name || subForm.url,
			
			parentForm: formController.getView(),
			owner: this,

			// Default toolbar
			dockedItems: [{
				xtype: 'toolbar',
				dock: 'bottom',
				hidden: true,
				style: {border: 0},
				bind: {
					hidden: '{!editing}'
				},
				items: ['->',{
					text: 'Add',
					cls: 'ck-form-add ck-form-add-'+cssSuffix,
					handler: this.addItem,
					bind: {
						hidden: '{updating}'
					},
					scope: this
				},{
					text: 'Update',
					cls: 'ck-form-update ck-form-update-'+cssSuffix,
					handler: this.updateItem,
					bind: {
						hidden: '{!updating}'
					},
					scope: this
				},{
					text: 'Cancel',
					cls: 'ck-form-cancel ck-form-cancel-'+cssSuffix,
					handler: this.resetSubForm,
					scope: this
				}]
			}]
		};


		// add subform in a panel
		if(subForm.renderTo) {
				var ct = Ext.getCmp(subForm.renderTo);
				if(!ct) ct = formController.lookupReference(subForm.renderTo);
				if(!ct) {
					Ck.Notify.error("Enable to render subform '"+ subForm.url +"' in '"+ subForm.renderTo +"'")
					return;
				}
				ct.removeAll(true);
				this._subform = ct.add(this._subform);

		//  dock subform on right of the grid
		} else if(subForm.docked) {
			// Adding toolbar for subform on grid
			if(subForm.docked === true) subForm.docked = 'right';
			var docked = {};
			if(Ext.isString(subForm.docked)) {
				docked.dock = subForm.docked;
			} else {
				docked = subForm.docked;
			}

			 grid.addDocked({
				dock: docked.dock,
				width: docked.width || 500,
				items: [this._subform]
			});
			// Get subform
			this._subform = grid.down('ckform');
		// (default) add subform in popup
		} else {
			if(!subForm.window) {
				subForm.window = {
					modal: true,
					scrollable: 'y'
				}
			}
			this._subformWindow = Ext.create('Ext.window.Window', Ext.applyIf({
				layout: 'fit',
				closeAction: 'hide',
				items: this._subform,
				listeners: {
					close: this.resetSubForm,
					scope: this
				}
			}, subForm.window));

			if(this.addbutton) {
				// Add toolbar for adding new item in grid (open window...)
				grid.addDocked({
					xtype: 'toolbar',
					dock: 'top',
					bind: {
						hidden: '{!editing}'
					},
					style: {border: 0},
					items: ['->', {
						cls: 'ck-form-new ck-form-new-' + cssSuffix,
						text: this.addbuttonText,
						handler: function() {
							this.newItem();
						},
						bind: {
							hidden: '{updating}'
						},
						scope: this
					}]
				});
			}

			this._subform = this._subformWindow.down('ckform');

			//Add reference to parentForm
			this._subform.getController().parentForm = formController;
		}

		var vm = this._subform.getViewModel();
		vm.set('updating', false);

 		// Get the Action Column
		this.actionColumn = grid.down('actioncolumn');
		if(!this.actionColumn) {
			var actions = [];
			if(this.editrow !== false || this.clicksToEdit == 0) {
				// Add edit button in action column
				actions.push({
					isDisabled: function(v, r, c, i, rec) {
						if(!rec) return true;
						if(rec.get('dummy')) return true;
						if(this.disableEditRow) {
							if(rec.get(this.disableEditRow.property) === this.disableEditRow.value) return true
						}
						return false;
					},
					getClass: function(v, meta, rec) {
						if(!meta.record) return false; // hide icon on row editting
						if(rec && rec.get('dummy')) return false;
						return 'fa fa-edit';
					},
					tooltip: 'Edit row',
					handler: function(view, rowIndex, colIndex, item, e, rec, row) {
						// e.stopPropagation();
						this.loadItem(view, rec, row, rowIndex);
					},
					scope: this
				});
			}
			if(this.deleterow !==false) {
				actions.push({
					isDisabled: function(v, r, c, i, rec) {
						if(!rec) return true;
						if(rec.get('dummy')) return true;
						if(this.disableDeleteRow) {
							if(rec.get(this.disableDeleteRow.property) === this.disableDeleteRow.value) return true
						}
						return false;
					},
					getClass: function(v, meta, rec) {
						if(!meta.record) return false; // hide icon on row editting
						if(rec && rec.get('dummy')) return false;
						return 'fa fa-close';
					},
					tooltip: 'Delete row',
					handler: function(view, rowIndex, colIndex, item, e, rec, row) {
						// e.stopPropagation();
						this.deleteItem(view, rowIndex);
					},
					scope: this
				});
			}

			var conf = grid.getInitialConfig();
			
			// Add action column for editing by plugin GridEditing
			var col = (Ext.isArray(conf.columns))? conf.columns : conf.columns.items;
			col.push({
				xtype: 'actioncolumn',
				width: 6 + (actions.length * 20),
				items: actions,
				flex: 0
			});

			grid.reconfigure(col);
			this.actionColumn = grid.down('actioncolumn');
		}


		// On start editing
		formController.on({
			startEditing: this.startEditing,
			stopEditing: this.stopEditing,
			scope: this
		});
		// Init editing state
		if(this._subform.editing === true) {
			this.startEditing();
		}
		if(this._subform.editing === false) {
			this.stopEditing();
		}
		//

		if(this.clicksToEdit != 0) {
			grid.on('row' + (this.clicksToEdit === 1 ? 'click' : 'dblclick'), function(cmp, record, tr, rowIndex, e, eOpts) {
				// Prevent load data when clic on action column ! handler of the action already pass...
				if(!Ext.fly(e.target).hasCls('x-action-col-icon')) {
					this.loadItem(cmp, record, tr, rowIndex);
				}
			}, this);
		}

		if(this.commitrow === true) {
			grid.on('beforeedit', function (e, context) {
				formController.getViewModel().set('rowdata', context.record.getData());
			}, this);

			grid.on('edit', function (e, context) {
				// Call on validate new row. The new row is now validated.
				if(!context) return;

				if(this._subformWindow) {
					this._subformWindow.show();
					this._subformWindow.setVisible(false);
				}

				// Get subform controller
				var formController = this._subform.getController();

				// Load data - allow to use form override if exist
				var data = context.record.getData();
				this.setDataFid(data);
				formController.loadData({
					raw: data
				});

				// Init update mode
				var vm = this._subform.getViewModel();
				vm.set('updating', true);
				
				// Save subform data - allow to use form override if exist
				formController.saveData({
					success: function(res) {
						vm.set('updating', false);

						// Save main form too
						if(this.autocommit) {
							var controller = this._grid.lookupController();
							controller.saveData();
						}

						this.resetSubForm();
					},
					scope: this
				});
			}, this);
		}

		this._subform.owner = this;
	},

	startEditing: function() {
		// add & show action column
		this.actionColumn.show();

		// Enable rowediting plugin
		var sfplugin = this._grid.findPlugin('rowediting');
		if(sfplugin) sfplugin.enable();
	},

	stopEditing: function() {
		// hide action column
		this.actionColumn.hide();

		// Disable rowediting plugin
		var sfplugin = this._grid.findPlugin('rowediting');
		if(sfplugin) sfplugin.disable();

		// Force
		this.clicksToEdit = 1;
	},

	addItem: function() {
		// Get subform controller
		var formController = this._subform.getController();

		// Save to server if params available, otherwise
		// saveData check form validity
		formController.saveData({
			success: function(res) {
				if(this.addItemLast===true) {
					// Add new record at the end
					this._grid.getStore().add(res);
				}else{
					// Insert new record	at the beginning
					this._grid.getStore().insert(0, res);
				}
				this._grid.getView().refresh();

				if(this.autocommit) {
					var controller = this._grid.lookupController();
					// When subform don't save data (global save), need to reload here to sync ID if necessary  
					controller.saveData({
						reload: true
					});
				}
				
				this.resetSubForm();
			},
			create: true,
			scope: this
		});
	},

	updateItem: function() {
		// Get subform controller
		var formController = this._subform.getController();

		// Save if params available
		formController.saveData({
			success: function(res) {
				// End update mode
				var vm = this._subform.getViewModel();
				vm.set('updating', false);

				// Update selected record
				var rec = this._grid.getStore().getAt(this._subform.rowIndex);
				if(rec) rec.set(res);
				this._grid.getView().refresh();

				if(this.autocommit) {
					var controller = this._grid.lookupController();
					controller.saveData();
				}
				
				this.resetSubForm();
			},
			scope: this
		});
	},

	deleteItem: function(grid, rowIndex) {

 		// End update mode
		var vm = this._subform.getViewModel();
		vm.set('updating', false);

		var formController = this._subform.getController();
		var store = grid.getStore();
		var rec = store.getAt(rowIndex);

		// update data fid for current item (used by dataUrl templating)
		var dataFid = this.setDataFid(rec.getData());
		//

		// Delete record if params available
		formController.deleteData({
			success: function() {
				store.remove(rec);
				
				// Not added by Ext ! need for compatibility to get back deleted records via store.getRemovedRecords()
				store.removed.push(rec);

				if(this.autocommit) {
					var controller = this._grid.lookupController();
					controller.saveData();
				}

				// Reset dataFid only (resetSubForm can fail with popup and destroyed views)
				if(this.mainDataFid) this._subform.setDataFid(this.mainDataFid);
			},
			fid: dataFid,
			scope: this
		});
	},

	newItem: function(data) {
		if(!this._subform) return;
		var formController = this._subform.getController();

		// Force reset
		this.resetSubForm();
		// Force start editing
		formController.startEditing();

		if(this._subformWindow) {
			this._subformWindow.show();
		}

		// Load subform data
		if(data) {
			// update data fid for new item (used by dataUrl templating)
			this.setDataFid(data);

			formController.loadData({
				raw: data
			});
		}
	},

	loadItem: function(view, rec, tr, rowIndex) {
		if(!this._subform) return;

		if(this._subformWindow) {
			this._subformWindow.show();
		}

		var formController = this._subform.getController();
		var grid = this._grid;

		var data = rec.getData();
		var fidName = grid.subform.fid || grid.fid || 'fid';
		var fidValue = data[fidName] || data.fid ;

		var dataUrl = grid.subform.dataUrl || formController.dataUrl;

		// update data fid for current loading item (used by dataUrl templating)
		var dataFid = this.setDataFid(data);
		//

		// By default load subform with data from the grid
		var options = {
			raw: data
		};

		// If find un Feature Id, try load with it
		if(fidValue) {
			options = {
				fid: fidValue
			};
		}

		// If find a Data URL, try load with it instead
		if(dataUrl) {
			if(Ext.isObject(dataUrl)) {
				dataUrl = dataUrl.read;
			}
			var tpl = new Ext.Template(dataUrl);
			dataUrl = tpl.apply(dataFid);
			options = {
				fid: dataFid,
				url: dataUrl
			};
		}

		if(Ext.isDefined(rowIndex)) this._subform.rowIndex = rowIndex;

		// Finally load subform data with fid, url or data
		formController.loadData(options);

		// Init update mode
		var vm = this._subform.getViewModel();
		vm.set('updating', true);
	},

	setDataFid: function(data) {
		var vDataFid = this._subform.getDataFid();
		this.mainDataFid = Ext.clone(vDataFid);
		var dataFid = {};
		if(Ext.isString(vDataFid)) {
			dataFid = Ext.apply({
				fid: vDataFid
			}, data);
		} else{
			dataFid = Ext.apply(vDataFid, data);
		}
		this._subform.setDataFid(dataFid);

		return dataFid;
	},

	resetSubForm: function() {
		var vm = this._subform.getViewModel();
		vm.set('updating', false);

		this._subform.getController().resetData();
		this._grid.focus();

		// Reset dataFid too
		if(this.mainDataFid) this._subform.setDataFid(this.mainDataFid);
		// Clear current selected rowIndex
		delete this._subform.rowIndex;

		if(this._subformWindow) {
			this._subformWindow.hide();
		}
	}
});
