/* @flow */
/**
 * @jsx React.DOM

 */

const React                 = require('react');
const BaseGrid              = require('../../Grid');
const Row                   = require('../../Row');
const ExcelColumn           = require('./ExcelColumn');
const KeyboardHandlerMixin  = require('../../KeyboardHandlerMixin');
const CheckboxEditor        = require('../editors/CheckboxEditor');
const FilterableHeaderCell  = require('../cells/headerCells/FilterableHeaderCell');
const cloneWithProps        = require('react/lib/cloneWithProps');
const DOMMetrics           = require('../../DOMMetrics');
const ColumnMetricsMixin      = require('../../ColumnMetricsMixin');
const RowUtils = require('../../RowUtils');
const ColumnUtils = require('../../ColumnUtils');

if (!Object.assign) {
  Object.assign = require('object-assign');
}
type SelectedType = {
  rowIdx: number;
  idx: number;
};

type DraggedType = {
  idx: number;
  rowIdx: number;
  value: string;
};

type ReactDataGridProps = {
  rowHeight: number;
  minHeight: number;
  enableRowSelect: ?boolean;
  onRowUpdated: ?() => void;
  columns: Array<ExcelColumn>;
  rowGetter: () => Array<any>;
  rowsCount: number;
  toolbar: ?any;
  enableCellSelect: ?boolean;
  onCellCopyPaste: ?() => any;
  onCellsDragged: ?() => any;
  onFilter: ?() => any;
};

type RowUpdateEvent = {
  keyCode: string;
  changed: {expandedHeight: number};
  rowIdx: number;
};

const ReactDataGrid = React.createClass({

  mixins: [
    ColumnMetricsMixin,
    DOMMetrics.MetricsComputatorMixin,
    KeyboardHandlerMixin
  ],

  propTypes: {
    rowHeight: React.PropTypes.number.isRequired,
    headerRowHeight: React.PropTypes.number,
    minHeight: React.PropTypes.number.isRequired,
    minWidth: React.PropTypes.number,
    enableRowSelect: React.PropTypes.bool,
    onRowUpdated: React.PropTypes.func,
    rowGetter: React.PropTypes.func.isRequired,
    rowsCount: React.PropTypes.number.isRequired,
    toolbar: React.PropTypes.element,
    enableCellSelect: React.PropTypes.bool,
    columns: React.PropTypes.oneOfType([React.PropTypes.object, React.PropTypes.array]).isRequired,
    onFilter: React.PropTypes.func,
    onCellCopyPaste: React.PropTypes.func,
    onCellsDragged: React.PropTypes.func,
    onAddFilter: React.PropTypes.func,
    onGridSort: React.PropTypes.func
  },

  getDefaultProps(): {enableCellSelect: boolean} {
    return {
      enableCellSelect: false,
      tabIndex: -1,
      rowHeight: 35,
      enableRowSelect: false,
      minHeight: 350
    };
  },

  getInitialState: function(): {selected: SelectedType; copied: ?{idx: number; rowIdx: number}; selectedRows: Array<Row>; expandedRows: Array<Row>; canFilter: boolean; columnFilters: any; sortDirection: ?SortType; sortColumn: ?ExcelColumn; dragged: ?DraggedType;  } {
    let columnMetrics = this.createColumnMetrics();
    let initialState = {columnMetrics, selectedRows: this.getInitialSelectedRows(), copied: null, expandedRows: [], canFilter: false, columnFilters: {}, sortDirection: null, sortColumn: null, dragged: null, scrollOffset: 0 };
    if (this.props.enableCellSelect) {
      initialState.selected = {rowIdx: 0, idx: 0};
    } else {
      initialState.selected = {rowIdx: -1, idx: -1};
    }
    return initialState;
  },

  componentWillReceiveProps: function(nextProps: ReactDataGridProps) {
    if (nextProps.rowsCount  === this.props.rowsCount + 1) {
      this.onAfterAddRow(nextProps.rowsCount + 1);
    }
  },

  onSelect: function(selected: SelectedType) {
    if (this.props.enableCellSelect) {
      if (this.state.selected.rowIdx !== selected.rowIdx
        || this.state.selected.idx !== selected.idx
        || this.state.selected.active === false) {
        let idx = selected.idx;
        let rowIdx = selected.rowIdx;
        if (
            idx >= 0
            && rowIdx >= 0
            && idx < ColumnUtils.getSize(this.state.columnMetrics.columns)
            && rowIdx < this.props.rowsCount
          ) {
          this.setState({selected: selected});
        }
      }
    }
  },

  onCellClick: function(cell: SelectedType) {
    this.onSelect({rowIdx: cell.rowIdx, idx: cell.idx});
  },

  onCellDoubleClick: function(cell: SelectedType) {
    this.onSelect({rowIdx: cell.rowIdx, idx: cell.idx});
    this.setActive('Enter');
  },

  onViewportDoubleClick: function() {
    this.setActive();
  },

  onPressArrowUp(e: SyntheticEvent) {
    this.moveSelectedCell(e, -1, 0);
  },

  onPressArrowDown(e: SyntheticEvent) {
    this.moveSelectedCell(e, 1, 0);
  },

  onPressArrowLeft(e: SyntheticEvent) {
    this.moveSelectedCell(e, 0, -1);
  },

  onPressArrowRight(e: SyntheticEvent) {
    this.moveSelectedCell(e, 0, 1);
  },

  onPressTab(e: SyntheticEvent) {
    this.moveSelectedCell(e, 0, e.shiftKey ? -1 : 1);
  },

  onPressEnter(e: SyntheticKeyboardEvent) {
    this.setActive(e.key);
  },

  onPressDelete(e: SyntheticKeyboardEvent) {
    this.setActive(e.key);
  },

  onPressEscape(e: SyntheticKeyboardEvent) {
    this.setInactive(e.key);
  },

  onPressBackspace(e: SyntheticKeyboardEvent) {
    this.setActive(e.key);
  },

  onPressChar(e: SyntheticKeyboardEvent) {
    if (this.isKeyPrintable(e.keyCode)) {
      this.setActive(e.keyCode);
    }
  },

  onPressKeyWithCtrl(e: SyntheticKeyboardEvent) {
    let keys = {
      KeyCode_c: 99,
      KeyCode_C: 67,
      KeyCode_V: 86,
      KeyCode_v: 118
    };

    let idx = this.state.selected.idx;
    if (this.canEdit(idx)) {
      if (e.keyCode === keys.KeyCode_c || e.keyCode === keys.KeyCode_C) {
        let value = this.getSelectedValue();
        this.handleCopy({ value: value });
      } else if (e.keyCode === keys.KeyCode_v || e.keyCode === keys.KeyCode_V) {
        this.handlePaste();
      }
    }
  },

  onCellCommit(commit: RowUpdateEvent) {
    let selected = Object.assign({}, this.state.selected);
    selected.active = false;
    if (commit.key === 'Tab') {
      selected.idx += 1;
    }
    let expandedRows = this.state.expandedRows;
    // if(commit.changed && commit.changed.expandedHeight){
    //   expandedRows = this.expandRow(commit.rowIdx, commit.changed.expandedHeight);
    // }
    this.setState({selected: selected, expandedRows: expandedRows});
    this.props.onRowUpdated(commit);
  },

  onDragStart(e: SyntheticEvent) {
    let value = this.getSelectedValue();
    this.handleDragStart({idx: this.state.selected.idx, rowIdx: this.state.selected.rowIdx, value: value});
    // need to set dummy data for FF
    if (e && e.dataTransfer && e.dataTransfer.setData) e.dataTransfer.setData('text/plain', 'dummy');
  },

  onAfterAddRow: function(numberOfRows: number) {
    this.setState({selected: { idx: 1, rowIdx: numberOfRows - 2 }});
  },

  onToggleFilter() {
    this.setState({ canFilter: !this.state.canFilter });
  },

  handleDragStart(dragged: DraggedType) {
    if (!this.dragEnabled()) { return; }
    let idx = dragged.idx;
    let rowIdx = dragged.rowIdx;
    if (
        idx >= 0
        && rowIdx >= 0
        && idx < this.getSize()
        && rowIdx < this.props.rowsCount
      ) {
      this.setState({ dragged: dragged });
    }
  },

  handleDragEnd() {
    if (!this.dragEnabled()) { return; }
    let fromRow;
    let toRow;
    let selected = this.state.selected;
    let dragged = this.state.dragged;
    let cellKey = this.getColumn(this.state.selected.idx).key;
    fromRow = selected.rowIdx < dragged.overRowIdx ? selected.rowIdx : dragged.overRowIdx;
    toRow   = selected.rowIdx > dragged.overRowIdx ? selected.rowIdx : dragged.overRowIdx;
    if (this.props.onCellsDragged) {
      this.props.onCellsDragged({cellKey: cellKey, fromRow: fromRow, toRow: toRow, value: dragged.value});
    }
    this.setState({dragged: {complete: true}});
  },

  handleDragEnter(row: any) {
    if (!this.dragEnabled()) { return; }
    let dragged = this.state.dragged;
    dragged.overRowIdx = row;
    this.setState({dragged: dragged});
  },

  handleTerminateDrag() {
    if (!this.dragEnabled()) { return; }
    this.setState({ dragged: null });
  },

  handlePaste() {
    if (!this.copyPasteEnabled()) { return; }
    let selected = this.state.selected;
    let cellKey = this.getColumn(this.state.selected.idx).key;

    if (this.props.onCellCopyPaste) {
      this.props.onCellCopyPaste({cellKey: cellKey, rowIdx: selected.rowIdx, value: this.state.textToCopy, fromRow: this.state.copied.rowIdx, toRow: selected.rowIdx});
    }
    this.setState({copied: null});
  },

  handleCopy(args: {value: string}) {
    if (!this.copyPasteEnabled()) { return; }
    let textToCopy = args.value;
    let selected = this.state.selected;
    let copied = {idx: selected.idx, rowIdx: selected.rowIdx};
    this.setState({textToCopy: textToCopy, copied: copied});
  },

  handleSort: function(columnKey: string, direction: SortType) {
    this.setState({sortDirection: direction, sortColumn: columnKey}, function() {
      this.props.onGridSort(columnKey, direction);
    });
  },

  // columnKey not used here as this function will select the whole row,
  // but needed to match the function signature in the CheckboxEditor
  handleRowSelect(rowIdx: number, columnKey: string, e: Event) {
    e.stopPropagation();
    if (this.state.selectedRows !== null && this.state.selectedRows.length > 0) {
      let selectedRows = this.state.selectedRows.slice();
      if (selectedRows[rowIdx] === null || selectedRows[rowIdx] === false) {
        selectedRows[rowIdx] = true;
      } else {
        selectedRows[rowIdx] = false;
      }
      this.setState({selectedRows: selectedRows});
    }
  },

  handleCheckboxChange: function(e: SyntheticEvent) {
    let allRowsSelected;
    if (e.currentTarget instanceof HTMLInputElement && e.currentTarget.checked === true) {
      allRowsSelected = true;
    } else {
      allRowsSelected = false;
    }
    let selectedRows = [];
    for (let i = 0; i < this.props.rowsCount; i++) {
      selectedRows.push(allRowsSelected);
    }
    this.setState({selectedRows: selectedRows});
  },

  getScrollOffSet() {
    let scrollOffset = 0;
    let canvas = this.getDOMNode().querySelector('.react-grid-Canvas');
    if (canvas) {
      scrollOffset = canvas.offsetWidth - canvas.clientWidth;
    }
    this.setState({scrollOffset: scrollOffset});
  },

  getRowOffsetHeight(): number {
    let offsetHeight = 0;
    this.getHeaderRows().forEach((row) => offsetHeight += parseFloat(row.height, 10) );
    return offsetHeight;
  },

  getHeaderRows(): Array<{ref: string; height: number;}> {
    let rows = [{ ref: 'row', height: this.props.headerRowHeight || this.props.rowHeight }];
    if (this.state.canFilter === true) {
      rows.push({
        ref: 'filterRow',
        headerCellRenderer: <FilterableHeaderCell onChange={this.props.onAddFilter} />,
        height: 45
      });
    }
    return rows;
  },

  getInitialSelectedRows: function() {
    let selectedRows = [];
    for (let i = 0; i < this.props.rowsCount; i++) {
      selectedRows.push(false);
    }
    return selectedRows;
  },

  getSelectedValue(): string {
    let rowIdx = this.state.selected.rowIdx;
    let idx = this.state.selected.idx;
    let cellKey = this.getColumn(idx).key;
    let row = this.props.rowGetter(rowIdx);
    return RowUtils.get(row, cellKey);
  },

  moveSelectedCell(e: SyntheticEvent, rowDelta: number, cellDelta: number) {
    // we need to prevent default as we control grid scroll
    // otherwise it moves every time you left/right which is janky
    e.preventDefault();
    let rowIdx = this.state.selected.rowIdx + rowDelta;
    let idx = this.state.selected.idx + cellDelta;
    this.onSelect({idx: idx, rowIdx: rowIdx});
  },

  setActive(keyPressed: string) {
    let rowIdx = this.state.selected.rowIdx;
    let idx = this.state.selected.idx;
    if (this.canEdit(idx) && !this.isActive()) {
      let selected = Object.assign(this.state.selected, {idx: idx, rowIdx: rowIdx, active: true, initialKeyCode: keyPressed});
      this.setState({selected: selected});
    }
  },

  setInactive() {
    let rowIdx = this.state.selected.rowIdx;
    let idx = this.state.selected.idx;
    if (this.canEdit(idx) && this.isActive()) {
      let selected = Object.assign(this.state.selected, {idx: idx, rowIdx: rowIdx, active: false});
      this.setState({selected: selected});
    }
  },

  canEdit(idx: number): boolean {
    let col = this.getColumn(idx);
    return this.props.enableCellSelect === true && ((col.editor != null) || col.editable);
  },

  isActive(): boolean {
    return this.state.selected.active === true;
  },

  setupGridColumns: function(props = this.props): Array<any> {
    let cols = props.columns.slice(0);
    let unshiftedCols = {};
    if (props.enableRowSelect) {
      let selectColumn = {
        key: 'select-row',
        name: '',
        formatter: <CheckboxEditor/>,
        onCellChange: this.handleRowSelect,
        filterable: false,
        headerRenderer: <input type="checkbox" onChange={this.handleCheckboxChange} />,
        width: 60,
        locked: true
      };
      unshiftedCols = cols.unshift(selectColumn);
      cols = unshiftedCols > 0 ? cols : unshiftedCols;
    }
    return cols;
  },


  copyPasteEnabled: function(): boolean {
    return this.props.onCellCopyPaste !== null;
  },

  dragEnabled: function(): boolean {
    return this.props.onCellsDragged !== null;
  },

  renderToolbar(): ReactElement {
    let Toolbar = this.props.toolbar;
    if (React.isValidElement(Toolbar)) {
      return ( cloneWithProps(Toolbar, {onToggleFilter: this.onToggleFilter, numberOfRows: this.props.rowsCount}));
    }
  },

  render: function(): ?ReactElement {
    let cellMetaData = {
      selected: this.state.selected,
      dragged: this.state.dragged,
      onCellClick: this.onCellClick,
      onCellDoubleClick: this.onCellDoubleClick,
      onCommit: this.onCellCommit,
      onCommitCancel: this.setInactive,
      copied: this.state.copied,
      handleDragEnterRow: this.handleDragEnter,
      handleTerminateDrag: this.handleTerminateDrag
    };

    let toolbar = this.renderToolbar();
    let containerWidth = this.props.minWidth || this.DOMMetrics.gridWidth();
    let gridWidth = containerWidth - this.state.scrollOffset;

    return (
      <div className="react-grid-Container" style={{width: containerWidth}}>
        {toolbar}
        <div className="react-grid-Main">
          <BaseGrid
            ref="base"
            {...this.props}
            headerRows={this.getHeaderRows()}
            columnMetrics={this.state.columnMetrics}
            rowGetter={this.props.rowGetter}
            rowsCount={this.props.rowsCount}
            rowHeight={this.props.rowHeight}
            cellMetaData={cellMetaData}
            selectedRows={this.state.selectedRows}
            expandedRows={this.state.expandedRows}
            rowOffsetHeight={this.getRowOffsetHeight()}
            sortColumn={this.state.sortColumn}
            sortDirection={this.state.sortDirection}
            onSort={this.handleSort}
            minHeight={this.props.minHeight}
            totalWidth={gridWidth}
            onViewportKeydown={this.onKeyDown}
            onViewportDragStart={this.onDragStart}
            onViewportDragEnd={this.handleDragEnd}
            onViewportDoubleClick={this.onViewportDoubleClick}
            onColumnResize={this.onColumnResize}/>
          </div>
        </div>
      );
  }
});


module.exports = ReactDataGrid;
