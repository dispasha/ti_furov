document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});

class AppModel {
  static async getTasklists() {
    const tasklistsRes = await fetch('http://localhost:4321/tasklists');
    return await tasklistsRes.json();
  }

  static async addTasklist(tasklistName) {
    const result = await fetch(
      'http://localhost:4321/tasklists',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tasklistName })
      }
    );

    const resultData = await result.json();

    return result.status === 200
      ? resultData
      : Promise.reject(resultData);
  }

  static async addTask({
    tasklistId,
    taskName,
    taskTime
  }) {
    const result = await fetch(
      `http://localhost:4321/tasklists/${tasklistId}/tasks`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([{ taskName },{ taskTime }])
      }
    );
    const resultData = await result.json();

    return result.status === 200
      ? resultData
      : Promise.reject(resultData);
  }

  static async editTask({
    tasklistId,
    taskId,
    newTaskName,
    newTaskTime
  }) {
    const result = await fetch(
      `http://localhost:4321/tasklists/${tasklistId}/tasks/${taskId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([{ newTaskName },{ newTaskTime }])
      }
    );

    const resultData = await result.json();

    return result.status === 200
      ? resultData
      : Promise.reject(resultData);
  }

  static async deleteTask({
    tasklistId,
    taskId
  }) {
    const result = await fetch(
      `http://localhost:4321/tasklists/${tasklistId}/tasks/${taskId}`,
      {
        method: 'DELETE'
      }
    );

    const resultData = await result.json();

    return result.status === 200
      ? resultData
      : Promise.reject(resultData);
  }

  static async moveTask({
    fromTasklistId,
    toTasklistId,
    taskId
  }) {
    const result = await fetch(
      `http://localhost:4321/tasklists/${fromTasklistId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ toTasklistId, taskId })
      }
    );

    const resultData = await result.json();

    return result.status === 200
      ? resultData
      : Promise.reject(resultData);
  }
}


class App {
  constructor() {
    this.tasklists = [];
  }

  onEscapeKeydown = ({ key }) => {
    if (key === 'Escape') {
      const input = document.getElementById('add-tasklist-input');
      input.style.display = 'none';
      input.value = '';

      document.getElementById('tm-tasklist-add-tasklist')
        .style.display = 'inherit';
    }
  };

  onInputKeydown = async ({ key, target }) => {
    if (key === 'Enter') {
      if (target.value) {
        await AppModel.addTasklist(target.value);

        this.tasklists.push(
          new Tasklist({
            tlName: target.value,
            tlID: `TL${this.tasklists.length}`,
            moveTask: this.moveTask
          })
        );

        this.tasklists[this.tasklists.length - 1].render();
      }
      
      target.style.display = 'none';
      target.value = '';

      document.getElementById('tm-tasklist-add-tasklist')
        .style.display = 'inherit';
    }
  };

  moveTask = async ({ taskID, direction }) => {
    let [
      tlIndex,
      taskIndex
    ] = taskID.split('-T');
    tlIndex = Number(tlIndex.split('TL')[1]);
    taskIndex = Number(taskIndex);
    const taskName = this.tasklists[tlIndex].tasks[taskIndex][0];
    const taskTime = this.tasklists[tlIndex].tasks[taskIndex][1];
    const targetTlIndex = direction === 'left'
      ? tlIndex - 1
      : tlIndex + 1;

    try {
      await AppModel.moveTask({
        fromTasklistId: tlIndex,
        toTasklistId: targetTlIndex,
        taskId: taskIndex
      });

      this.tasklists[tlIndex].deleteTask(taskIndex);
      this.tasklists[targetTlIndex].addTask(taskName, taskTime);
      this.tasklists = [];
      const container = document.querySelector('main');
      container.innerHTML = `    <div class="tm-tasklist">
                                  <input
                                    type="date"
                                    placeholder="Новый список"
                                    id="add-tasklist-input"
                                  />
                                  <button
                                    type="button"
                                    id="tm-tasklist-add-tasklist"
                                  >
                                    Добавить день
                                  </button>
                                </div>`

      this.init();
    } catch (error) {
      console.error('ERROR', error);
    }
  };

  async init() {
    const tasklists = await AppModel.getTasklists();
    tasklists.forEach(({ tasklistName, tasks }) => {
      const newTasklist = new Tasklist({
        tlName: tasklistName,
        tlID: `TL${this.tasklists.length}`,
        moveTask: this.moveTask
      });
      tasks.forEach(task => newTasklist.tasks.push(task));
      
      this.tasklists.push(newTasklist);
      newTasklist.render();
      newTasklist.rerenderTasks();
    });

    document.getElementById('tm-tasklist-add-tasklist')
      .addEventListener(
        'click',
        (event) => {
          event.target.style.display = 'none';

          const input = document.getElementById('add-tasklist-input');
          input.style.display = 'inherit';
          input.focus();
        }
      );

    document.addEventListener('keydown', this.onEscapeKeydown);

    document.getElementById('add-tasklist-input')
      .addEventListener('keydown', this.onInputKeydown);

    document.querySelector('.toggle-switch input')
      .addEventListener(
        'change',
        ({ target: { checked } }) => {
          checked
            ? document.body.classList.add('dark-theme')
            : document.body.classList.remove('dark-theme');
        }
      );
  }
}

function parseTime( t ) {
  if (t == '') return null;
  var time = t.match( /(\d\d?)(?::(\d\d))?/ );
  if (time == null) return "invalid"
  var hour = parseInt( time[1]);
  var minute = ( parseInt( time[2]) || 0 );
  if (hour < 8 || hour > 19 || minute < 0 || minute > 59) return "range"
  if (hour < 10) hour = "0" + hour;
  if (minute < 10) minute = "0" + minute;
  return hour + ":" + minute;
}

class Tasklist {
  constructor({
    tlName,
    tlID,
    moveTask
  }) {
    this.tlName = tlName;
    this.tlID = tlID;
    this.tasks = [];
    this.moveTask = moveTask;
  }

  onAddTaskButtonClick = async () => {
    const newTaskName = prompt('Введите фамилию пациента:');
    const newTaskTime = parseTime(prompt('Введите время приема:'));
    if (newTaskTime == "invalid") {alert("Неверно введено время"); return}
    if (newTaskTime == "range") {alert("Время должно быть в промежутке с 8 утра до 8 вечера"); return}
    if (!newTaskName || !newTaskTime) return;
    
    const tasklistId = Number(this.tlID.split('TL')[1]);
    try {
      
      await AppModel.addTask({
        tasklistId,
        taskName: newTaskName,
        taskTime: newTaskTime
      });
      this.addTask(newTaskName, newTaskTime);
    } catch (error) {
      console.error('ERROR', error);
    }
  };

  addTask = (taskName, taskTime) => {
    this.tasks.push([taskName, taskTime]);
    this.rerenderTasks();

    
  };

  onEditTask = async (taskID) => {
    const taskIndex = Number(taskID.split('-T')[1]);
    const oldTaskName = this.tasks[taskIndex][0];
    const oldTaskTime = this.tasks[taskIndex][1];
    const newTaskName = prompt('Измените фамилию', oldTaskName);
    const newTaskTime = parseTime( prompt('Измените время приема:', oldTaskTime));
    if (newTaskTime == "invalid") {alert("Неверно введено время"); return}
    if (newTaskTime == "range") {alert("Время должно быть в промежутке с 8 утра до 8 вечера"); return}
    if (!newTaskName || !newTaskTime) return;

    const tasklistId = Number(this.tlID.split('TL')[1]);
    try {
      await AppModel.editTask({
        tasklistId,
        taskId: taskIndex,
        newTaskName,
        newTaskTime
      });

      this.tasks[taskIndex] = [newTaskName, newTaskTime];
      this.rerenderTasks();
    } catch (error) {
      console.error('ERROR', error);
    }
  };

  onDeleteTaskButtonClick = async (taskID) => {
    const taskIndex = Number(taskID.split('-T')[1]);
    const taskName = this.tasks[taskIndex][0];

    if (!confirm(`Приём пациента '${taskName}' будет отменён. Продолжить?`)) return;

    const tasklistId = Number(this.tlID.split('TL')[1]);
    try {
      await AppModel.deleteTask({
        tasklistId,
        taskId: taskIndex
      });
      this.deleteTask(taskIndex);
    } catch (error) {
      console.error('ERROR', error);
    }
  };

  deleteTask = (taskIndex) => {
    this.tasks.splice(taskIndex, 1);
    this.rerenderTasks();
  };

  rerenderTasks = () => {
    const tasklist = document.querySelector(`#${this.tlID} ul`);
    tasklist.innerHTML = '';
    this.tasks.sort((a,b) => { 
      if (a[1] < b[1]) return -1;
      else if (a[1] > b[1]) return 1;
      else return 0})
    this.tasks.forEach((taskName, taskIndex) => {
      tasklist.appendChild(
        this.renderTask({
          taskID: `${this.tlID}-T${taskIndex}`,
          taskName: taskName[0],
          taskTime: taskName[1],
        })
      );
    });
  };

  renderTask = ({ taskID, taskName, taskTime }) => {
    const task = document.createElement('li');
    task.classList.add('tm-tasklist-task');
    task.id = taskID;
    const span = document.createElement('span');
    span.classList.add('tm-tasklist-task-text');
    span.innerHTML = taskName + " - " + taskTime;
    task.appendChild(span);

    const controls = document.createElement('div');
    controls.classList.add('tm-tasklist-task-controls');

    const upperRow = document.createElement('div');
    upperRow.classList.add('tm-tasklist-task-controls-row');

    const leftArrow = document.createElement('button');
    leftArrow.type = 'button';
    leftArrow.classList.add(
      'tm-tasklist-task-controls-button',
      'left-arrow'
    );
    leftArrow.addEventListener(
      'click',
      () => this.moveTask({ taskID, direction: 'left' })
    );
    upperRow.appendChild(leftArrow);

    const rightArrow = document.createElement('button');
    rightArrow.type = 'button';
    rightArrow.classList.add(
      'tm-tasklist-task-controls-button',
      'right-arrow'
    );
    rightArrow.addEventListener(
      'click',
      () => this.moveTask({ taskID, direction: 'right' })
    );
    upperRow.appendChild(rightArrow);

    controls.appendChild(upperRow);

    const lowerRow = document.createElement('div');
    lowerRow.classList.add('tm-tasklist-task-controls-row');

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.classList.add(
      'tm-tasklist-task-controls-button',
      'edit-icon'
    );
    editButton.addEventListener('click', () => this.onEditTask(taskID));
    lowerRow.appendChild(editButton);

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.classList.add(
      'tm-tasklist-task-controls-button',
      'delete-icon'
    );
    deleteButton.addEventListener('click', () => this.onDeleteTaskButtonClick(taskID));
    lowerRow.appendChild(deleteButton);

    controls.appendChild(lowerRow);

    task.appendChild(controls);

    return task;
  };

  render() {
    const tasklist = document.createElement('div');
    tasklist.classList.add('tm-tasklist');
    tasklist.id = this.tlID;

    const header = document.createElement('header');
    header.classList.add('tm-tasklist-header');
    header.innerHTML = this.tlName;
    tasklist.appendChild(header);

    const list = document.createElement('ul');
    list.classList.add('tm-tasklist-tasks');
    tasklist.appendChild(list);

    const footer = document.createElement('footer');
    const button = document.createElement('button');
    button.type = 'button';
    button.classList.add('tm-tasklist-add-task');
    button.innerHTML = 'Добавить приём';
    button.addEventListener('click', this.onAddTaskButtonClick);
    footer.appendChild(button);
    tasklist.appendChild(footer);
    const container = document.querySelector('main');
    container.insertBefore(tasklist, container.lastElementChild);

  }
}
