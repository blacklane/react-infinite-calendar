import React, {Component, PropTypes} from 'react';
import classNames from 'classnames';
import debounce from 'lodash/debounce';
import range from 'lodash/range';
import {emptyFn, ScrollSpeed} from '../utils';
import {defaultProps} from 'recompose';
import defaultDisplayOptions from '../utils/defaultDisplayOptions';
import defaultLocale from '../utils/defaultLocale';
import defaultTheme from '../utils/defaultTheme';
import Today, {DIRECTION_UP, DIRECTION_DOWN} from '../Today';
import Header from '../Header';
import MonthList from '../MonthList';
import Weekdays from '../Weekdays';
import Years from '../Years';
import Day from '../Day';

import parse from 'date-fns/parse';
import format from 'date-fns/format';
import getDay from 'date-fns/get_day';
import startOfMonth from 'date-fns/start_of_month';
import startOfDay from 'date-fns/start_of_day';

const styles = {
  container: require('./Container.scss'),
  day: require('../Day/Day.scss'),
};

export const withDefaultProps = defaultProps({
  autoFocus: true,
  DayComponent: Day,
  display: 'days',
  displayOptions: {},
  handlers: [],
  height: 500,
  keyboardSupport: true,
  max: new Date(2050, 11, 31),
  maxDate: new Date(2050, 11, 31),
  min: new Date(1980, 0, 1),
  minDate: new Date(1980, 0, 1),
  onHighlightedDateChange: emptyFn,
  onScroll: emptyFn,
  onScrollEnd: emptyFn,
  onSelect: emptyFn,
  rowHeight: 56,
  shouldPreventSelect: () => false,
  tabIndex: 1,
  width: 400,
  YearComponent: Years,
});

export default class Calendar extends Component {
  constructor(props) {
    super(...arguments);

    this.updateYears(props);

    this.state = {
      display: props.display,
    };
  }
  static propTypes = {
    autoFocus: PropTypes.bool,
    className: PropTypes.string,
    DayComponent: PropTypes.func,
    disabledDates: PropTypes.arrayOf(PropTypes.instanceOf(Date)),
    disabledDays: PropTypes.arrayOf(PropTypes.number),
    display: PropTypes.oneOf(['years', 'days']),
    displayOptions: PropTypes.shape({
      hideYearsOnSelect: PropTypes.bool,
      layout: PropTypes.oneOf(['portrait', 'landscape']),
      overscanMonthCount: PropTypes.number,
  		shouldHeaderAnimate: PropTypes.bool,
      showHeader: PropTypes.bool,
  		showOverlay: PropTypes.bool,
  		showTodayHelper: PropTypes.bool,
      todayHelperRowOffset: PropTypes.number,
    }),
    handlers: PropTypes.arrayOf(PropTypes.string),
    height: PropTypes.number,
    keyboardSupport: PropTypes.bool,
    locale: PropTypes.shape({
      blank: PropTypes.string,
      headerFormat: PropTypes.string,
      todayLabel: PropTypes.shape({
        long: PropTypes.string,
        short: PropTypes.string,
      }),
      weekdays: PropTypes.arrayOf(PropTypes.string),
      weekStartsOn: PropTypes.oneOf([0, 1, 2, 3, 4, 5, 6]),
    }),
    max: PropTypes.instanceOf(Date),
    maxDate: PropTypes.instanceOf(Date),
    min: PropTypes.instanceOf(Date),
    minDate: PropTypes.instanceOf(Date),
    onHighlightedDateChange: PropTypes.func,
    onScroll: PropTypes.func,
    onScrollEnd: PropTypes.func,
    onSelect: PropTypes.func,
    rowHeight: PropTypes.number,
    selectedDate: PropTypes.instanceOf(Date),
    shouldPreventSelect: PropTypes.func,
    tabIndex: PropTypes.number,
    theme: PropTypes.shape({
      floatingNav: PropTypes.shape({
        background: PropTypes.string,
        chevron: PropTypes.string,
        color: PropTypes.string,
      }),
      headerColor: PropTypes.string,
      selectionColor: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
      textColor: PropTypes.shape({
        active: PropTypes.string,
        default: PropTypes.string,
      }),
      todayColor: PropTypes.string,
      weekdayColor: PropTypes.string,
    }),
    width: PropTypes.number,
    YearComponent: PropTypes.func,
  };
  componentDidMount() {
    let {autoFocus} = this.props;

    if (autoFocus) {
      this.node.focus();
    }
  }
  componentWillUpdate(nextProps, nextState) {
    let {min, minDate, max, maxDate} = this.props;

    if (nextProps.min !== min || nextProps.minDate !== minDate || nextProps.max !== max || nextProps.maxDate !== maxDate) {
      this.updateYears(nextProps);
    }

    if (nextProps.display !== this.props.display) {
      this.setState({display: nextProps.display});
    }
  }
  updateYears(props = this.props) {
    this._min = parse(props.min);
    this._max = parse(props.max);
    this._minDate = parse(props.minDate);
    this._maxDate = parse(props.maxDate);

    let min = this._min.getFullYear();
    let max = this._max.getFullYear();

    const months = [];
    let year, month;
    for (year = min; year <= max; year++) {
      for (month = 0; month < 12; month++) {
        months.push({month, year});
      }
    }

    this.months = months;
  }
  getDisabledDates(disabledDates) {
    return disabledDates && disabledDates.map((date) => format(parse(date), 'YYYY-MM-DD'));
  }
  _displayOptions = {};
  getDisplayOptions(displayOptions = this.props.displayOptions) {
    return Object.assign(this._displayOptions, defaultDisplayOptions, displayOptions);
  }
  _locale = {};
  getLocale() {
    return Object.assign(this._locale, defaultLocale, this.props.locale);
  }
  _theme = {};
  getTheme() {
    return Object.assign(this._theme, defaultTheme, this.props.theme);
  }
  getCurrentOffset = () => {
    return this.scrollTop;
  }
  getDateOffset = (date) => {
    return this._MonthList && this._MonthList.getDateOffset(date);
  };
  scrollTo = (offset) => {
    return this._MonthList && this._MonthList.scrollTo(offset);
  }
  scrollToDate = (date = new Date(), offset) => {
    return this._MonthList && this._MonthList.scrollToDate(date, offset);
  };
  getScrollSpeed = new ScrollSpeed().getScrollSpeed;
  onScroll = ({scrollTop}) => {
    const {onScroll} = this.props;
    const {isScrolling} = this.state;
    const {showTodayHelper, showOverlay} = this.getDisplayOptions();
    const scrollSpeed = this.scrollSpeed = Math.abs(this.getScrollSpeed(scrollTop));
    this.scrollTop = scrollTop;

		// We only want to display the months overlay if the user is rapidly scrolling
    if (showOverlay && scrollSpeed >= 50 && !isScrolling) {
      this.setState({
        isScrolling: true,
      });
    }

    if (showTodayHelper) {
      this.updateTodayHelperPosition(scrollSpeed);
    }

    onScroll(scrollTop);
    this.onScrollEnd();
  };
  onScrollEnd = debounce(() => {
    const {onScrollEnd} = this.props;
    const {isScrolling} = this.state;
    const {showTodayHelper} = this.getDisplayOptions();

    if (isScrolling) {
      this.setState({isScrolling: false});
    }

    if (showTodayHelper) {
      this.updateTodayHelperPosition(0);
    }

    onScrollEnd(this.scrollTop);
  }, 150);
  updateTodayHelperPosition = (scrollSpeed) => {
    const today = this.today;
    const scrollTop = this.scrollTop;
    const {showToday} = this.state;
    const {height, rowHeight} = this.props;
    const {todayHelperRowOffset} = this.getDisplayOptions();
    let newState;

    if (!this._todayOffset) {
      this._todayOffset = (
				this.getDateOffset(today) + // scrollTop offset of the month "today" is in
				Math.ceil((today.getDate() - 7 + getDay(startOfMonth(today))) / 7) * rowHeight // offset of "today" within its month
			);
    }

    if (scrollTop >= this._todayOffset + rowHeight * (todayHelperRowOffset+1)) {
      if (showToday !== DIRECTION_UP) newState = DIRECTION_UP; //today is above the fold
    } else if (scrollTop + height <= this._todayOffset + rowHeight - rowHeight * (todayHelperRowOffset+1)) {
      if (showToday !== DIRECTION_DOWN) newState = DIRECTION_DOWN; //today is below the fold
    } else if (showToday && scrollSpeed <= 1) {
      newState = false;
    }

    if (scrollTop === 0) {
      newState = false;
    }

    if (newState != null) {
      this.setState({showToday: newState});
    }
  };
  setDisplay = (display) => {
    this.setState({display});
  }
  render() {
    let {
			className,
      DayComponent,
			disabledDays,
      handlers,
			height,
			minDate,
			maxDate,
      onDayClick,
      selected,
			tabIndex,
			width,
      YearComponent,
			...other
		} = this.props;
    const {
      hideYearsOnSelect,
      layout,
      overscanMonthCount,
      shouldHeaderAnimate,
      showHeader,
      showOverlay,
      showTodayHelper,
    } = this.getDisplayOptions();
    const {display, isScrolling, showToday} = this.state;
    const disabledDates = this.getDisabledDates(this.props.disabledDates);
    const locale = this.getLocale();
    const theme = this.getTheme();
    const today = this.today = startOfDay(new Date());

    return (
      <div
        tabIndex={tabIndex}
        className={classNames(className, styles.container.root, {
          [styles.container.landscape]: layout === 'landscape',
        })}
        style={{color: theme.textColor.default, width}}
        aria-label="Calendar"
        ref={node => {
          this.node = node;
        }}
        {...handlers.reduce((acc, handlerKey) => (
          Object.assign(acc, {[handlerKey]: this.props[handlerKey]})
        ), {})}
      >
        {showHeader &&
          <Header
            selected={selected}
            shouldHeaderAnimate={Boolean(shouldHeaderAnimate && display !== 'years')}
            layout={layout}
            theme={theme}
            locale={locale}
            scrollToDate={this.scrollToDate}
            setDisplay={this.setDisplay}
            display={display}
          />
        }
        <div className={styles.container.wrapper}>
          <Weekdays weekdays={locale.weekdays} weekStartsOn={locale.weekStartsOn} theme={theme} />
          <div className={styles.container.listWrapper}>
            {showTodayHelper &&
              <Today
                scrollToDate={this.scrollToDate}
                show={showToday}
                today={today}
                theme={theme}
                todayLabel={locale.todayLabel.long}
              />
            }
            <MonthList
              ref={instance => {
                this._MonthList = instance;
              }}
              {...other}
              DayComponent={DayComponent}
              width={width}
              height={height}
              disabledDates={disabledDates}
              disabledDays={disabledDays}
              months={this.months}
              onDayClick={onDayClick}
              onScroll={this.onScroll}
              isScrolling={isScrolling}
              today={today}
              min={this._min}
              minDate={this._minDate}
              maxDate={this._maxDate}
              theme={theme}
              locale={locale}
              overscanMonthCount={overscanMonthCount}
              selected={selected}
              showOverlay={showOverlay}
            />
          </div>
          {display === 'years' &&
            <YearComponent
              ref={instance => {
                this._Years = instance;
              }}
              {...other}
              width={width}
              height={height}
              minDate={minDate}
              maxDate={maxDate}
              selected={selected}
              theme={theme}
              today={today}
              years={range(this._min.getFullYear(), this._max.getFullYear() + 1)}
              setDisplay={this.setDisplay}
              scrollToDate={this.scrollToDate}
              hideYearsOnSelect={hideYearsOnSelect}
            />
          }
        </div>
      </div>
    );
  }
};