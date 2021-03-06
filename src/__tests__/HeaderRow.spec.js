const React         = require('react');
const rewire        = require('rewire');
const TestUtils     = require('react/lib/ReactTestUtils');
const rewireModule  = require('../../test/rewireModule');
const StubComponent = require('../../test/StubComponent');
const helpers       = require('./GridPropHelpers');
const HeaderRow     = rewire('../HeaderRow');

describe('Header Unit Tests', () => {
  let headerRow;

  // Configure local letiable replacements for the module.
  let SortableHeaderCellStub = new StubComponent('SortableHeaderCell');
  let HeaderCellStub = new StubComponent('HeaderCell');

  rewireModule(HeaderRow, {
    SortableHeaderCell: SortableHeaderCellStub,
    HeaderCell: HeaderCellStub
  });

  let testProps = {
    columns: helpers.columns,
    onColumnResize: function() {},
    onSort: function() {},
    sortDirection: 'NONE',
    sortColumn: null,
    height: 35
  };

  beforeEach(() => {
    headerRow = TestUtils.renderIntoDocument(<HeaderRow {...testProps}/>);
  });

  it('should create a new instance of HeaderRow', () => {
    expect(headerRow).toBeDefined();
  });

  describe('When column is sortable', () => {
    let sortableColIdx = 1;
    beforeEach(() => {
      testProps.columns[sortableColIdx].sortable = true;
      headerRow = TestUtils.renderIntoDocument(<HeaderRow {...testProps} sortColumn={testProps.columns[sortableColIdx].key} />);
    });

    afterEach(() => {
      testProps.columns[sortableColIdx].sortable = false;
    });

    it('should provide column with a sortableHeaderRenderer', () => {
      let headerCells = TestUtils.scryRenderedComponentsWithType(headerRow, HeaderCellStub);
      expect(TestUtils.isElementOfType(headerCells[sortableColIdx].props.renderer, SortableHeaderCellStub)).toBe(true);
    });

    it('should pass sort direction as props to headerRenderer when column is sortColumn', () => {
      headerRow = TestUtils.renderIntoDocument(<HeaderRow {...testProps} sortColumn={testProps.columns[sortableColIdx].key} sortDirection={'ASC'} />);
      let headerCells = TestUtils.scryRenderedComponentsWithType(headerRow, HeaderCellStub);
      let sortableHeaderRenderer = headerCells[sortableColIdx].props.renderer;
      expect(sortableHeaderRenderer.props.sortDirection).toEqual('ASC');
    });

    it('should call onSort when headerRender triggers sort', () => {
      // arrange
      spyOn(testProps, 'onSort');
      headerRow = TestUtils.renderIntoDocument(<HeaderRow {...testProps} sortColumn={testProps.columns[sortableColIdx].key} sortDirection={'ASC'} />);
      let headerCells = TestUtils.scryRenderedComponentsWithType(headerRow, HeaderCellStub);
      let sortableHeaderRenderer = headerCells[sortableColIdx].props.renderer;
      // act
      sortableHeaderRenderer.props.onSort('title', 'DESC');
      // assert
      expect(testProps.onSort).toHaveBeenCalled();
      expect(testProps.onSort.mostRecentCall.args[0]).toEqual('title');
      expect(testProps.onSort.mostRecentCall.args[1]).toEqual('DESC');
    });
  });
});
