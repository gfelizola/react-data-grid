const React = require('react');
const rewire = require('rewire');
const Grid = rewire('../grids/ReactDataGrid.js');
const TestUtils = require('react/lib/ReactTestUtils');
const rewireModule = require('../../../test/rewireModule');
const StubComponent = require('../../../test/StubComponent');
const mockStateObject = require('./data/MockStateObject');

describe('Grid', function() {
  let BaseGridStub = new StubComponent('BaseGrid');
  let CheckboxEditorStub = new StubComponent('CheckboxEditor');

  // Configure local letiable replacements for the module.
  rewireModule(Grid, {
    BaseGrid: BaseGridStub,
    CheckboxEditor: CheckboxEditorStub
  });

  beforeEach(function() {
    this.columns = [
      { key: 'id', name: 'ID', width: 100 },
      { key: 'title', name: 'Title', width: 100 },
      { key: 'count', name: 'Count', width: 100 }
    ];

    this._rows = [];
    this._selectedRows = [];
    this.rowGetter = (i) => this._rows[i];

    for (let i = 0; i < 1000; i++) {
      this._rows.push({
        id: i,
        title: `Title ${i}`,
        count: i * 1000,
        isOdd: !!(i % 2)
      });

      this._selectedRows.push(false);
    }

    this.noop = function() {};
    this.testProps = {
      enableCellSelect: true,
      columns: this.columns,
      rowGetter: this.rowGetter,
      rowsCount: this._rows.length,
      width: 300,
      onRowUpdated: this.noop,
      onCellCopyPaste: this.noop,
      onCellsDragged: this.noop,
      onGridSort: this.noop,
      onAddFilter: () => {}
    };

    this.buildFakeEvent = (addedData) => {
      return Object.assign({}, {
        preventDefault: this.noop,
        stopPropagation: this.noop
      }, addedData);
    };

    this.buildFakeCellUodate = (addedData) => {
      return Object.assign({}, {
        cellKey: 'title',
        rowIdx: 0,
        updated: { title: 'some new title' },
        key: 'Enter'
      }, addedData);
    };

    this.getBaseGrid = () => TestUtils.findRenderedComponentWithType(this.component, BaseGridStub);
    this.getCellMetaData = () => this.getBaseGrid().props.cellMetaData;

    this.simulateGridKeyDown = (key, ctrlKey) => {
      let fakeEvent = this.buildFakeEvent({
        key: key,
        keyCode: key,
        ctrlKey: ctrlKey
      });
      this.getBaseGrid().props.onViewportKeydown(fakeEvent);
    };

    let buildProps = (addedProps) => Object.assign({}, this.testProps, addedProps);
    this.createComponent = (addedProps) => {
      return TestUtils.renderIntoDocument(<Grid {...buildProps(addedProps)}/>);
    };

    this.component = this.createComponent();
  });

  it('should create a new instance of Grid', function() {
    expect(this.component).toBeDefined();
  });

  it('should render a BaseGrid stub', function() {
    expect(this.getBaseGrid()).toBeDefined();
  });

  it('should be initialized with correct state', function() {
    expect(this.component.state).toEqual(mockStateObject({
      selectedRows: this._selectedRows
    }));
  });

  describe('if passed in as props to grid', function() {
    beforeEach(function() {
      const ToolBarStub = new StubComponent('Toolbar');
      this.component = this.createComponent({ toolbar: <ToolBarStub /> });
      this.toolbarInstance = TestUtils.findRenderedComponentWithType(this.component, ToolBarStub);
    });

    it('should render a Toolbar', function() {
      expect(this.toolbarInstance).toBeDefined();
    });

    describe('onToggleFilter trigger of Toolbar', function() {
      beforeEach(function() {
        this.toolbarInstance.props.onToggleFilter();
        this.baseGrid = this.getBaseGrid();
      });

      it('should set filter state of grid and render a filterable header row', function() {
        let filterableHeaderRow = this.baseGrid.props.headerRows[1];
        expect(this.component.state.canFilter).toBe(true);
        expect(this.baseGrid.props.headerRows.length).toEqual(2);
        expect(filterableHeaderRow.ref).toEqual('filterRow');
      });
    });
  });

  describe('When cell selection disabled', function() {
    beforeEach(function() {
      this.component = this.createComponent({
        enableCellSelect: false,
        columns: this.columns,
        rowGetter: this.rowGetter,
        rowsCount: this._rows.length,
        width: 300
      });
    });

    it('grid should be initialized with selected state of {rowIdx : -1, idx : -1}', function() {
      expect(this.component.state.selected).toEqual({ rowIdx: -1, idx: -1 });
    });
  });

  describe('When row selection enabled', function() {
    beforeEach(function() {
      this.component = this.createComponent({ enableRowSelect: true });
      this.baseGrid = this.getBaseGrid();
      this.selectRowCol = this.baseGrid.props.columnMetrics.columns[0];
    });

    it('should render an additional Select Row column', function() {
      expect(this.baseGrid.props.columnMetrics.columns.length).toEqual(this.columns.length + 1);
      expect(this.selectRowCol.key).toEqual('select-row');
      expect(TestUtils.isElementOfType(this.selectRowCol.formatter, CheckboxEditorStub)).toBe(true);
    });

    describe('checking header checkbox', function() {
      beforeEach(function() {
        let checkboxWrapper = document.createElement('div');
        checkboxWrapper.innerHTML = '<input type="checkbox" value="value" checked="true" />';
        this.checkbox = checkboxWrapper.querySelector('input');

        this.headerCheckbox = this.selectRowCol.headerRenderer;
        this.fakeEvent = this.buildFakeEvent({ currentTarget: this.checkbox });
        this.headerCheckbox.props.onChange(this.fakeEvent);
      });

      it('should select all rows', function() {
        let selectedRows = this.component.state.selectedRows;
        expect(selectedRows.length).toEqual(this._rows.length);

        expect(selectedRows.length).toBeGreaterThan(1);
        selectedRows.forEach((selected) => expect(selected).toBe(true));
      });

      describe('and then unchecking header checkbox', function() {
        beforeEach(function() {
          this.checkbox.checked = false;
          this.headerCheckbox.props.onChange(this.fakeEvent);
        });

        it('should deselect all rows', function() {
          let selectedRows = this.component.state.selectedRows;

          expect(selectedRows.length).toBeGreaterThan(1);
          selectedRows.forEach((selected) => expect(selected).toBe(false));
        });
      });
    });

    describe('when selected is false', function() {
      beforeEach(function() {
        this.component.setState({ selectedRows: [false, false, false, false] });
        let selectRowCol = this.baseGrid.props.columnMetrics.columns[0];
        selectRowCol.onCellChange(3, 'select-row', this.buildFakeEvent());
      });

      it('should be able to select an individual row', function() {
        expect(this.component.state.selectedRows[3]).toBe(true);
      });
    });

    describe('when selected is null', function() {
      beforeEach(function() {
        this.component.setState({ selectedRows: [null, null, null, null] });
        let selectRowCol = this.baseGrid.props.columnMetrics.columns[0];
        selectRowCol.onCellChange(2, 'select-row', this.buildFakeEvent());
      });

      it('should be able to select an individual row', function() {
        expect(this.component.state.selectedRows[2]).toBe(true);
      });
    });

    describe('when selected is true', function() {
      beforeEach(function() {
        this.component.setState({ selectedRows: [null, true, true, true] });
        let selectRowCol = this.baseGrid.props.columnMetrics.columns[0];
        selectRowCol.onCellChange(3, 'select-row', this.buildFakeEvent());
      });

      it('should be able to unselect an individual row ', function() {
        expect(this.component.state.selectedRows[3]).toBe(false);
      });
    });
  });

  describe('User Interaction', function() {
    it('hitting TAB should decrement selected cell index by 1', function() {
      this.simulateGridKeyDown('Tab');
      expect(this.component.state.selected).toEqual({ idx: 1, rowIdx: 0 });
    });

    describe('When selected cell is in top corner of grid', function() {
      beforeEach(function() {
        this.component.setState({ selected: { idx: 0, rowIdx: 0 } });
      });

      it('on ArrowUp keyboard event should not change selected index', function() {
        this.simulateGridKeyDown('ArrowUp');
        expect(this.component.state.selected).toEqual({ idx: 0, rowIdx: 0 });
      });

      it('on ArrowLeft keyboard event should not change selected index', function() {
        this.simulateGridKeyDown('ArrowLeft');
        expect(this.component.state.selected).toEqual({ idx: 0, rowIdx: 0 });
      });
    });

    describe('When selected cell has adjacent cells on all sides', function() {
      beforeEach(function() {
        this.component.setState({ selected: { idx: 1, rowIdx: 1 } });
      });

      it('on ArrowRight keyboard event should increment selected cell index by 1', function() {
        this.simulateGridKeyDown('ArrowRight');
        expect(this.component.state.selected).toEqual({ idx: 2, rowIdx: 1 });
      });

      it('on ArrowDown keyboard event should increment selected row index by 1', function() {
        this.simulateGridKeyDown('ArrowDown');
        expect(this.component.state.selected).toEqual({ idx: 1, rowIdx: 2 });
      });

      it('on ArrowLeft keyboard event should decrement selected row index by 1', function() {
        this.simulateGridKeyDown('ArrowLeft');
        expect(this.component.state.selected).toEqual({ idx: 0, rowIdx: 1 });
      });

      it('on ArrowUp keyboard event should decrement selected row index by 1', function() {
        this.simulateGridKeyDown('ArrowUp');
        expect(this.component.state.selected).toEqual({ idx: 1, rowIdx: 0 });
      });
    });

    describe('When column is editable', function() {
      beforeEach(function() {
        const editableColumn = Object.assign({ editable: true }, this.columns[1]);
        this.columns[1] = editableColumn;
        this.component = this.createComponent({ columns: this.columns });
      });

      describe('double click on grid', function() {
        beforeEach(function() {
          this.component.setState({ selected: { idx: 1, rowIdx: 1 } });
          this.getBaseGrid().props.onViewportDoubleClick();
        });

        it('should activate current selected cell', function() {
          expect(this.component.state.selected).toEqual({ idx: 1, rowIdx: 1, active: true });
        });
      });

      describe('copy a cell value', function() {
        beforeEach(function() {
          const cCharacterKeyCode = 99;
          this.component.setState({ selected: { idx: 1, rowIdx: 1 } });
          this.simulateGridKeyDown(cCharacterKeyCode, true);
        });

        it('should store the value in grid state', function() {
          let expectedCellValue = this._rows[1].title;
          expect(this.component.state.textToCopy).toEqual(expectedCellValue);
          expect(this.component.state.copied).toEqual({ idx: 1, rowIdx: 1 });
        });
      });

      describe('paste a cell value', function() {
        beforeEach(function() {
          const vCharacterKeyCode = 118;
          spyOn(this.testProps, 'onCellCopyPaste');
          this.component.setProps({ onCellCopyPaste: this.testProps.onCellCopyPaste });
          this.component.setState({
            textToCopy: 'banana',
            selected: { idx: 1, rowIdx: 5 },
            copied: { idx: 1, rowIdx: 1 }
          });
          this.simulateGridKeyDown(vCharacterKeyCode, true);
        });

        it('should call onCellCopyPaste of component with correct params', function() {
          expect(this.component.props.onCellCopyPaste).toHaveBeenCalled();
          expect(this.component.props.onCellCopyPaste.mostRecentCall.args[0]).toEqual({
            cellKey: 'title',
            rowIdx: 5,
            value: 'banana',
            fromRow: 1,
            toRow: 5
          });
        });
      });

      describe('cell commit cancel', function() {
        beforeEach(function() {
          this.component.setState({ selected: { idx: 1, rowIdx: 1, active: true } });
          this.getCellMetaData().onCommitCancel();
        });

        it('should set grid state inactive', function() {
          expect(this.component.state.selected).toEqual({ idx: 1, rowIdx: 1, active: false });
        });
      });

      describe('pressing escape', function() {
        beforeEach(function() {
          this.component.setState({ selected: { idx: 1, rowIdx: 1, active: true } });
          this.simulateGridKeyDown('Escape');
        });

        it('should set grid state inactive', function() {
          expect(this.component.state.selected).toEqual({ idx: 1, rowIdx: 1, active: false });
        });
      });

      describe('pressing enter', function() {
        beforeEach(function() {
          this.component.setState({ selected: { idx: 1, rowIdx: 1, active: false } });
          this.simulateGridKeyDown('Enter');
        });

        it('should set grid state active', function() {
          expect(this.component.state.selected).toEqual({ idx: 1, rowIdx: 1, active: true, initialKeyCode: 'Enter' });
        });
      });

      describe('pressing delete', function() {
        beforeEach(function() {
          this.component.setState({ selected: { idx: 1, rowIdx: 1, active: false } });
          this.simulateGridKeyDown('Delete');
        });

        it('should set grid state active', function() {
          expect(this.component.state.selected).toEqual({ idx: 1, rowIdx: 1, active: true, initialKeyCode: 'Delete' });
        });
      });

      describe('pressing backspace', function() {
        beforeEach(function() {
          this.component.setState({ selected: { idx: 1, rowIdx: 1, active: false } });
          this.simulateGridKeyDown('Backspace');
        });

        it('should set grid state active', function() {
          expect(this.component.state.selected).toEqual({ idx: 1, rowIdx: 1, active: true, initialKeyCode: 'Backspace' });
        });
      });

      describe('typing a char', function() {
        beforeEach(function() {
          const fakeEvent = this.buildFakeEvent({ keyCode: 66, key: 'Unidentified' });
          this.component.setState({ selected: { idx: 1, rowIdx: 1, active: false } });
          this.getBaseGrid().props.onViewportKeydown(fakeEvent);
        });

        it('should set grid state active and store the typed value', function() {
          expect(this.component.state.selected).toEqual({ idx: 1, rowIdx: 1, active: true, initialKeyCode: 66 });
        });
      });
    });

    describe('When column is not editable', function() {
      beforeEach(function() {
        const uneditableColumn = Object.assign({ editable: false }, this.columns[1]);
        this.columns[1] = uneditableColumn;
        this.component = this.createComponent({ columns: this.columns });
      });

      describe('double click on grid ', function() {
        beforeEach(function() {
          this.component.setState({ selected: { idx: 1, rowIdx: 1 } });
          this.getBaseGrid().props.onViewportDoubleClick();
        });

        it('should not activate current selected cell', function() {
          expect(this.component.state.selected).toEqual({ idx: 1, rowIdx: 1 });
        });
      });
    });

    describe('Drag events', function() {
      describe('dragging in grid', function() {
        beforeEach(function() {
          this.component.setState({ selected: { idx: 1, rowIdx: 2 } });
          this.getBaseGrid().props.onViewportDragStart();
        });

        it('should store drag rowIdx, idx and value of cell in state', function() {
          const thirdRowTitle = this._rows[2].title;
          expect(this.component.state.dragged).toEqual({ idx: 1, rowIdx: 2, value: thirdRowTitle });
        });
      });

      describe('dragging over a row', function() {
        beforeEach(function() {
          this.component.setState({
            selected: { idx: 1, rowIdx: 2 },
            dragged: { idx: 1, rowIdx: 2, value: 'apple', overRowIdx: 6 }
          });
          this.getCellMetaData().handleDragEnterRow(4);
        });

        it('should store the current rowIdx in grid state', function() {
          expect(this.component.state.dragged).toEqual({ idx: 1, rowIdx: 2, value: 'apple', overRowIdx: 4 });
        });
      });

      describe('finishing drag', function() {
        beforeEach(function() {
          spyOn(this.testProps, 'onCellsDragged');
          this.component.setProps({ onCellsDragged: this.testProps.onCellsDragged });
          this.component.setState({
            selected: { idx: 1, rowIdx: 2 },
            dragged: { idx: 1, rowIdx: 2, value: 'apple', overRowIdx: 6 }
          });
          this.getBaseGrid().props.onViewportDragEnd();
        });

        it('should trigger onCellsDragged event and call it with correct params', function() {
          expect(this.component.props.onCellsDragged).toHaveBeenCalled();
          expect(this.component.props.onCellsDragged.argsForCall[0][0]).toEqual({ cellKey: 'title', fromRow: 2, toRow: 6, value: 'apple' });
        });
      });

      describe('terminating drag', function() {
        beforeEach(function() {
          this.component.setState({ dragged: { idx: 1, rowIdx: 2, value: 'apple', overRowIdx: 6 } });
          this.getCellMetaData().handleTerminateDrag();
        });

        it('should clear drag state', function() {
          expect(this.component.state.dragged).toBe(null);
        });
      });
    });

    describe('Adding a new row', function() {
      beforeEach(function() {
        let newRow = { id: 1000, title: 'Title 1000', count: 1000 };
        this._rows.push(newRow);
        this.component.setProps({ rowsCount: this._rows.length });
      });

      it('should set the selected cell to be on the last row', function() {
        expect(this.component.state.selected).toEqual({
          idx: 1,
          rowIdx: 1000
        });
      });
    });

    describe('Adding a new column', function() {
      beforeEach(function() {
        const newColumn = { key: 'isodd', name: 'Is Odd', width: 100 };
        const newColumns = Object.assign([], this.columns);
        newColumns.splice(2, 0, newColumn);
        this.component.setProps({ columns: newColumns });
        this.columns = this.component.state.columnMetrics.columns;
      });

      it('should add column', function() {
        expect(this.columns.length).toEqual(4);
      });

      it('should calculate column metrics for added column', function() {
        expect(this.columns[2]).toEqual(jasmine.objectContaining({ key: 'isodd', name: 'Is Odd', width: 100 }));
      });
    });

    describe('Remove a column', function() {
      beforeEach(function() {
        const newColumns = Object.assign([], this.columns);
        newColumns.splice(1, 1);
        this.component.setProps({ columns: newColumns });
        this.columns = this.component.state.columnMetrics.columns;
      });

      it('should remove column', function() {
        expect(this.columns.length).toEqual(2);
      });

      it('should no longer include metrics for removed column', function() {
        expect(this.columns[0]).toEqual(jasmine.objectContaining({ key: 'id', name: 'ID', width: 100 }));
        expect(this.columns[1]).toEqual(jasmine.objectContaining({ key: 'count', name: 'Count', width: 100 }));
      });
    });
  });

  describe('Cell Meta Data', function() {
    it('should create a cellMetaData object and pass to baseGrid as props', function() {
      let meta = this.getCellMetaData();
      expect(meta).toEqual(jasmine.objectContaining({
        selected: { rowIdx: 0, idx: 0 },
        dragged: null,
        copied: null
      }));
      expect(meta.onCellClick).toBeFunction();
      expect(meta.onCommit).toBeFunction();
      expect(meta.onCommitCancel).toBeFunction();
      expect(meta.handleDragEnterRow).toBeFunction();
      expect(meta.handleTerminateDrag).toBeFunction();
    });

    describe('Changing Grid state', function() {
      beforeEach(function() {
        let newState = {
          selected: { idx: 2, rowIdx: 2 },
          dragged: { idx: 2, rowIdx: 2 }
        };
        this.component.setState(newState);
      });

      it(' should update cellMetaData', function() {
        expect(this.getCellMetaData()).toEqual(jasmine.objectContaining({
          selected: { idx: 2, rowIdx: 2 },
          dragged: { idx: 2, rowIdx: 2 }
        }));
      });
    });

    describe('cell commit', function() {
      beforeEach(function() {
        spyOn(this.testProps, 'onRowUpdated');
        this.component.setProps({ onRowUpdated: this.testProps.onRowUpdated });
        this.component.setState({ selected: { idx: 3, rowIdx: 3, active: true } });
        this.getCellMetaData().onCommit(this.buildFakeCellUodate());
      });

      it('should trigger onRowUpdated with correct params', function() {
        const onRowUpdated = this.component.props.onRowUpdated;
        expect(onRowUpdated.callCount).toEqual(1);
        expect(onRowUpdated.argsForCall[0][0]).toEqual(this.buildFakeCellUodate());
      });

      it('should deactivate selected cell', function() {
        expect(this.component.state.selected).toEqual({ idx: 3, rowIdx: 3, active: false });
      });
    });

    describe('cell commit after "Tab"', function() {
      beforeEach(function() {
        this.component.setState({ selected: { idx: 1, rowIdx: 1, active: true } });
        this.getCellMetaData().onCommit(this.buildFakeCellUodate({ key: 'Tab' }));
      });

      it('should select next cell', function() {
        expect(this.component.state.selected).toEqual({ idx: 2, rowIdx: 1, active: false });
      });
    });

    describe('Cell click', function() {
      beforeEach(function() {
        this.getCellMetaData().onCellClick({ idx: 2, rowIdx: 2 });
      });

      it('should set selected state of grid', function() {
        expect(this.component.state.selected).toEqual({ idx: 2, rowIdx: 2 });
      });
    });
  });

  describe('changes to non metric column data', function() {
    beforeEach(function() {
      this.originalMetrics = Object.assign({}, this.component.state.columnMetrics);
      const editableColumn = Object.assign({ editable: true }, this.columns[0]);
      this.columns[0] = editableColumn;
      this.component.setProps({ columns: this.columns });
    });

    it('should keep original metric information', function() {
      let columnMetrics = this.component.state.columnMetrics;
      expect(columnMetrics.columns.length).toBeGreaterThan(1);
      columnMetrics.columns.forEach((column, index) => {
        expect(column.width).toEqual(this.originalMetrics.columns[index].width);
        expect(column.left).toEqual(this.originalMetrics.columns[index].left);
      });
    });
  });

  describe('Table width', function() {
    beforeEach(function() {
      this.tableElement = React.findDOMNode(this.component);
    });

    it('should generate the width based on the container size', function() {
      expect(this.tableElement.style.width).toEqual('0px');
    });

    describe('providing table width as prop', function() {
      beforeEach(function() {
        this.component.setProps({ minWidth: 900 });
      });

      it('should set the width of the table', function() {
        expect(this.tableElement.style.width).toEqual('900px');
      });
    });
  });
});
