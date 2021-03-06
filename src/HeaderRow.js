const React             = require('react');
const shallowEqual      = require('lodash').isEqual;
const HeaderCell        = require('./HeaderCell');
const getScrollbarSize  = require('./getScrollbarSize');
const ExcelColumn  = require('./addons/grids/ExcelColumn');
const ColumnUtilsMixin  = require('./ColumnUtils');
const SortableHeaderCell    = require('./addons/cells/headerCells/SortableHeaderCell');
const PropTypes         = React.PropTypes;

const HeaderRowStyle  = {
  overflow: React.PropTypes.string,
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  height: React.PropTypes.number,
  position: React.PropTypes.string
};

const DEFINE_SORT = ['ASC', 'DESC', 'NONE'];

const HeaderRow = React.createClass({
  propTypes: {
    width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    height: PropTypes.number.isRequired,
    columns: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
    onColumnResize: PropTypes.func,
    onSort: PropTypes.func.isRequired,
    onColumnResizeEnd: PropTypes.func,
    style: PropTypes.shape(HeaderRowStyle),
    sortColumn: PropTypes.string,
    sortDirection: React.PropTypes.oneOf(DEFINE_SORT),
    cellRenderer: PropTypes.func,
    headerCellRenderer: PropTypes.func,
    resizing: PropTypes.func
  },

  mixins: [ColumnUtilsMixin],

  shouldComponentUpdate(nextProps: {width: ?(number | string); height: number; columns: Array<ExcelColumn>; style: ?HeaderRowStyle; onColumnResize: ?any}): boolean {
    return (
      nextProps.width !== this.props.width
      || nextProps.height !== this.props.height
      || nextProps.columns !== this.props.columns
      || !shallowEqual(nextProps.style, this.props.style)
      || this.props.sortColumn !== nextProps.sortColumn
      || this.props.sortDirection !== nextProps.sortDirection
    );
  },

  getHeaderRenderer(column) {
    if (column.sortable) {
      let sortDirection = (this.props.sortColumn === column.key) ? this.props.sortDirection : DEFINE_SORT.NONE;
      return <SortableHeaderCell columnKey={column.key} onSort={this.props.onSort} sortDirection={sortDirection}/>;
    }

    return this.props.headerCellRenderer || column.headerRenderer || this.props.cellRenderer;
  },

  getStyle(): HeaderRowStyle {
    return {
      overflow: 'hidden',
      width: '100%',
      height: this.props.height,
      position: 'absolute'
    };
  },

  getCells(): Array<HeaderCell> {
    let cells = [];
    let lockedCells = [];

    for (let i = 0, len = this.getSize(this.props.columns); i < len; i++) {
      let column = this.getColumn(this.props.columns, i);
      let cell = (
        <HeaderCell
          ref={i}
          key={i}
          height={this.props.height}
          column={column}
          renderer={this.getHeaderRenderer(column)}
          resizing={this.props.resizing === column}
          onResize={this.props.onColumnResize}
          onResizeEnd={this.props.onColumnResizeEnd}
          />
      );
      if (column.locked) {
        lockedCells.push(cell);
      } else {
        cells.push(cell);
      }
    }

    return cells.concat(lockedCells);
  },

  setScrollLeft(scrollLeft: number) {
    this.props.columns.forEach( (column, i) => {
      if (column.locked) {
        this.refs[i].setScrollLeft(scrollLeft);
      }
    });
  },

  render(): ?ReactElement {
    let cellsStyle = {
      width: this.props.width ? (this.props.width + getScrollbarSize()) : '100%',
      height: this.props.height,
      whiteSpace: 'nowrap',
      overflowX: 'hidden',
      overflowY: 'hidden'
    };

    let cells = this.getCells();
    return (
      <div {...this.props}  className="react-grid-HeaderRow">
        <div style={cellsStyle}>
          {cells}
        </div>
      </div>
    );
  }
});

module.exports = HeaderRow;
