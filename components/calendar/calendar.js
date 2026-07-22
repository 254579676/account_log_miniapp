Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    startDate: {
      type: String,
      value: ''
    },
    endDate: {
      type: String,
      value: ''
    }
  },

  data: {
    currentYear: 0,
    currentMonth: 0, // 0-11
    calendarDays: [],
    selectedStartDate: '',
    selectedEndDate: ''
  },

  observers: {
    show(newVal) {
      if (newVal) {
        this.initCalendar();
      }
    },
    startDate(newVal) {
      this.setData({
        selectedStartDate: newVal
      });
    },
    endDate(newVal) {
      this.setData({
        selectedEndDate: newVal
      });
    }
  },

  methods: {
    initCalendar() {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      
      this.setData({
        currentYear: year,
        currentMonth: month
      });
      
      this.generateCalendar(year, month);
    },

    generateCalendar(year, month) {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      
      // 一个月第一天是星期几 (0-6, 0表示星期日)
      const firstDayOfWeek = firstDay.getDay();
      
      // 上个月的最后几天
      const prevMonthLastDay = new Date(year, month, 0).getDate();
      
      const calendarDays = [];
      
      // 添加上个月的日期
      for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const day = prevMonthLastDay - i;
        const dateStr = this.formatDate(year, month, day);
        calendarDays.push({
          day: day,
          date: dateStr,
          className: 'disabled',
          isCurrentMonth: false
        });
      }
      
      // 添加当前月的日期
      const today = this.formatDate(new Date());
      const selectedStartDate = this.data.selectedStartDate;
      const selectedEndDate = this.data.selectedEndDate;
      
      for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = this.formatDate(year, month + 1, i);
        let className = 'normal';
        
        // 判断是否是今天
        if (dateStr === today) {
          className += ' today';
        }
        
        // 判断是否在选中范围内
        if (selectedStartDate && selectedEndDate) {
          if (dateStr === selectedStartDate && dateStr === selectedEndDate) {
            className += ' start-end-range';
          } else if (dateStr === selectedStartDate) {
            className += ' start-range';
          } else if (dateStr === selectedEndDate) {
            className += ' end-range';
          } else if (dateStr > selectedStartDate && dateStr < selectedEndDate) {
            className += ' range';
          }
        } else if (selectedStartDate && dateStr === selectedStartDate) {
          className += ' selected';
        }
        
        calendarDays.push({
          day: i,
          date: dateStr,
          className: className.trim(),
          isCurrentMonth: true
        });
      }
      
      // 添加下个月的日期，补全最后一周
      const totalCells = 42; // 6行7列
      const remainingCells = totalCells - calendarDays.length;
      for (let i = 1; i <= remainingCells; i++) {
        const dateStr = this.formatDate(year, month + 2, i);
        calendarDays.push({
          day: i,
          date: dateStr,
          className: 'disabled',
          isCurrentMonth: false
        });
      }
      
      this.setData({
        calendarDays: calendarDays
      });
    },

    formatDate(dateOrYear, month, day) {
      if (arguments.length === 1) {
        // 如果只传入一个参数，假设是Date对象
        const date = dateOrYear;
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      } else {
        // 传入年、月、日三个参数
        const y = dateOrYear;
        const m = String(month).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    },

    prevMonth() {
      let { currentYear, currentMonth } = this.data;
      
      if (currentMonth === 0) {
        currentYear--;
        currentMonth = 11;
      } else {
        currentMonth--;
      }
      
      this.setData({
        currentYear,
        currentMonth
      });
      
      this.generateCalendar(currentYear, currentMonth);
    },

    nextMonth() {
      let { currentYear, currentMonth } = this.data;
      
      if (currentMonth === 11) {
        currentYear++;
        currentMonth = 0;
      } else {
        currentMonth++;
      }
      
      this.setData({
        currentYear,
        currentMonth
      });
      
      this.generateCalendar(currentYear, currentMonth);
    },

    selectDate(e) {
      const date = e.currentTarget.dataset.date;
      let { selectedStartDate, selectedEndDate } = this.data;
      
      // console.log('选择日期:', date);
      // console.log('当前已选开始日期:', selectedStartDate);
      // console.log('当前已选结束日期:', selectedEndDate);
      
      // 如果开始日期和结束日期都已选择，重新开始选择
      if (selectedStartDate && selectedEndDate) {
        selectedStartDate = date;
        selectedEndDate = '';
      } 
      // 如果只选择了开始日期
      else if (selectedStartDate) {
        // 如果选择的日期早于开始日期，则交换
        if (date < selectedStartDate) {
          selectedEndDate = selectedStartDate;
          selectedStartDate = date;
        } else {
          selectedEndDate = date;
        }
      } 
      // 如果还没选择开始日期
      else {
        selectedStartDate = date;
      }
      
      // console.log('更新后开始日期:', selectedStartDate);
      // console.log('更新后结束日期:', selectedEndDate);
      
      this.setData({
        selectedStartDate,
        selectedEndDate
      });
      
      // 更新日历显示
      this.generateCalendar(this.data.currentYear, this.data.currentMonth);
    },

    onCancel() {
      this.triggerEvent('cancel');
    },

    onConfirm() {
      const { selectedStartDate, selectedEndDate } = this.data;
      if (selectedStartDate) {
        this.triggerEvent('confirm', {
          startDate: selectedStartDate,
          endDate: selectedEndDate || selectedStartDate
        });
      }
    }
  }
})