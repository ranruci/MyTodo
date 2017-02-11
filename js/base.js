;(function ($) {
	'use strict';
	var $body=$('body')
		,$form_add_task=$(".add-task")
		,$detail_task=$('.task-detail')
		,$detail_task_mask=$('.task-detail-mask')
		,$msg=$('.msg')
		,$msg_content=$('.msg-content')
		,$msg_confirm=$('.msg-confirm')
		,$alerter=$('.alerter')
	    ,task_list=[]
	    ,$delete_task_trig
	    ,$detail_task_trig
	    ,$check_complete
	    ,$detail_task_content
	    ,$detail_task_content_input
	    ;
    /*初始化清单*/
    init();

    /*
     *监听添加清单事件*/
	$form_add_task.on('submit',listen_task_add);

	/*监听清单隐藏事件*/
	$detail_task_mask.on('click', task_detial_hide);

	/*监听定时提醒消息确认事件*/
	$msg_confirm.on('click', listen_msg_confirm);

	/*
	 *初始化清单函数*/
	function init() {
		/*判断是否开启localstorage*/
		if (!store.enabled) {
            alert('Local storage is not supported by your browser. Please disable "Private Mode", or upgrade to a modern browser.')
            return
        }
        /*本地获取清单数据*/
		task_list=store.get('task_list') || [];
		/*如果清单数据不为空，那么更新清单数据并且渲染清单模板*/
		if (task_list) {
			refresh_task_list();
			/*监听提醒时间，定时提醒*/
			remind_date_check();
		}
	}

	/*
	 *自定义弹出框*/
	function pop(arg) {
		/*初始化配置*/
		var conf={
			boxWidth: '280',
			boxHeight: '150',
			title: '确认删除此清单？',
			boxBg: '#dea06b',
			titleColor: '#222',
			buttonBg: '#f6fffc',
			buttonBgHover: '#9adcc4'
		},
		$box,$mask,$pop_title,$pop_content,$confirm,$cancel,confirmed,timer,dfd;
		/*新建一个Deferred，实现点击确认或取消按钮后的回调*/
		dfd=$.Deferred();
		/*对弹出框组件传参进行处理*/
		if (typeof(arg) == 'string') {
			
			conf.title = arg;
		}else{
			
			conf=$.extend(true, conf, arg);
		}
		/*弹框模板和遮罩模板及其基本样式设定*/
		$box=$('<div>'+
			'<div class="pop-title">'+conf.title+'</div>'+
			'<div class="pop-content">'+
			'<button class="confirm" type="button">确定</button>'+
			'<button class="cancel" type="button">取消</button>'+
			'</div>'+
			'</div>').css({
			width: conf.boxWidth,
			height: conf.boxHeight,
			background: conf.boxBg,
			'border-radius': '3px',
			'box-shadow': '0 1px 2px rgba(0,0,0,.6)',
			position: 'fixed',
			left: '50%',
			top: '40%',
			marginTop: parseInt(-conf.boxHeight/2),
			marginLeft: parseInt(-conf.boxWidth/2),
			'text-align': 'center'
		});
		$mask=$('<div></div>').css({
			position: 'fixed',
			top: '0',
			right: '0',
			bottom: '0',
			left: '0',
			background: 'rgba(0,0,0,.3)'
		});
		/*将弹出框和遮罩层插入到body*/
		$body.append($mask);
		$body.append($box);
		/*获取确认及取消按钮*/
		$confirm=$('.confirm');
		$cancel=$('.cancel');
		/*设置弹框标题及按钮的样式*/
		$pop_title=$('.pop-title').css({
			height: parseInt(conf.boxHeight*0.618),
			lineHeight: parseInt(conf.boxHeight*0.618+10)+'px',
			padding: '0 5px',
			overflow: 'hidden',
			color: conf.titleColor,
			fontSize: 20
		});
		$pop_content=$('.pop-content').css('lineHeight', parseInt(conf.boxHeight*0.382)+'px');
		$pop_content.find('button').css({
			width: parseInt(conf.boxWidth*0.2),
			display: 'inline-block',
			border: 0,
			outline: 'none',
			cursor: 'pointer',
			background: conf.buttonBg,
			boxSizing: 'border-box',
			padding: '7px 10px',
			marginRight: parseInt(conf.boxWidth*0.12),
			marginLeft: parseInt(conf.boxWidth*0.12),
			'border-radius': '3px',
			'box-shadow': '0 1px 2px rgba(0,0,0,.4)',
			transition: 'background .2s'
		}).hover(function() {
			$(this).css('background', conf.buttonBgHover);
		}, function() {
			$(this).css('background', conf.buttonBg);
		});

		/*设置定时检测用户是否点击了弹框按钮*/
		timer=setInterval(function () {
			if (confirmed !== undefined) {
				/*如果用户点击了按钮，则改变Deferred对象的执行状态，并将flag值传入*/
				dfd.resolve(confirmed);
				/*清空定时器*/
				clearInterval(timer);
				/*销毁弹出组件*/
				dismiss_pop($mask,$box);                                                                                                                             
			}
		},50);
		/*当用户点击确认后，将flag设置为true*/
		$confirm.on('click', function() {
			confirmed =true;
		});
		/*当用户点击取消后，将flag设置为false*/
		$cancel.on('click', function() {
			confirmed =false;
		});
		/*当用户点击遮罩层时，将flag设置为false*/
		$mask.on('click', function() {
			confirmed =false;
		});
		/*返回deferred对象*/
		return dfd.promise();
	}

	/*销毁弹框组件*/
	function dismiss_pop(a,b) {
		a.remove();
		b.remove();
	}

	/*监听提醒时间，定时提醒*/
	function remind_date_check() {
		var i,item,current_time,remind_time;
		/*设置定时监听*/
		setInterval(function () {
			/*遍历task_list中的remind_date与当前时间对比*/
			for (i = 0; i < task_list.length; i++) {
				item=task_list[i];
				if (!item || !item.remind_date ||item.comfirmed) continue;
				current_time=new Date().getTime();
				remind_time=new Date(item.remind_date).getTime();
				/*如果设定时间小于等于当前时间，并且清单处于未完成状态，则启动提醒，并设置状态为已完成，
				 * 已提醒*/
				if (current_time-remind_time>=1 && !item.complete) {

					/*更新task_list中的值，并更新模板*/
					update_task(i,{comfirmed:true,complete:true});
					/*定时提醒提醒*/
					show_notice_msg(item.content);
					
				}
			}
		},400);
	}

    /*
     *定时提醒消息提示事件*/
	function show_notice_msg(content) {
		$msg_content.html(content);
		$msg.slideDown(400);
		$alerter.get(0).play();
	}

	/*
	 *定时提醒消息隐藏事件*/
	function hide_notice_msg() {
		$msg.slideUp(400);
	}

	/*
	 *监听定时提醒消息隐藏事件*/
	function listen_msg_confirm() {
		hide_notice_msg();
	}

	/*
	*添加清单事件*/
	function listen_task_add(e) {
 		/*阻止submit默认事件*/
		e.preventDefault();
		/*创建一个新对象用于存储清单内容数据；*/
		var new_task={}
		/*获取添加清单输入框内容，并复制给这个新对象*/
		   ,$input=$(this).find('input[name=content]')
		   ;
		new_task.content=$input.val();
		/*添加清单并清空输入框*/
		if(!new_task.content) return;
		if(add_task(new_task)){
			$input.val('');
		}
	}
	
	/*
	 *添加清单函数*/
	function add_task(new_task) {
		/*将新的清单数据添加到清单数组中*/
		task_list.push(new_task);
		/*更新本地清单数据，并重新渲染*/
		refresh_task_list();
		return true;
	}

	/*更新localstorage并渲染tpl(包括添加后删除清单)*/
	function refresh_task_list() {
		/*更新localstorage数据*/
		store.set('task_list',task_list);
		/*渲染模板*/
		render_task_list();
	}

	/*
	 *遍历清单数组并渲染模板*/
	function render_task_list() {
		var i,$task,$task_list=$('.task-list'),item,complete_items=[];
		$task_list.html('');

		for (i = 0; i < task_list.length; i++) {
			item=task_list[i];
			/*如果已经标记完成的清单，则放在清单 的末尾*/
			if (item && item.complete) {
				$task=task_item_tpl(item,i);
				$task.addClass('completed');
			    $task_list.append($task);
			/*如果未标记完成的清单，则前置*/
			} else {
				$task=task_item_tpl(item,i);
				$task_list.prepend($task);
			}
		}

		/*渲染模板后，获取所有删除和查看详情的按钮*/
		$delete_task_trig=$('.action.delete');
		$detail_task_trig=$('.action.detail');
		$check_complete=$('.task-list .complete');
		/*监听删除清单，查看详情事件*/
		listen_task_delete();
		listen_task_detail();
		listen_check_complete();
	}

	/*
	 *单个清单模板*/
	function task_item_tpl(data,index) {
		/*删除清单时会删除data，重新渲染模板时要判断data是否存在*/
		if(index==undefined || !data) return;
		/*创建单个清单html模板并返回*/
		var tpl='<li class="task-item" data-index="'+index+'">'+
        		'<span><input class="complete" type="checkbox" '+(data.complete ? "checked" : "")+'></span>'+
        		'<span class="task-content">'+data.content+'</span>'+
        		'<span class="fr">'+
        		'<span class="action delete">删除</span>'+
        		'<span class="action detail">详情</span>'+
        		'</span>'+
        	    '</li>';
        return $(tpl);
	}

	/*
	 *删除一个清单*/
	function delete_task(index) {
		/*如果没有index或者index的元素不存在，则返回*/
		if (index==undefined || !task_list[index]) return;
		//delete task_list[index];
		/*使用自定义弹框组件，并使用传参值进行判断是否删除清单*/
		pop().then(function (r) {
			r ? task_list.splice(index,1) : null;
			/*删除一条清单后更新localstorage，并且重新渲染tpl*/
			refresh_task_list();
	    });
	}

	/*
	 *监听删除清单事件函数*/
	function listen_task_delete() {
		$delete_task_trig.on('click', function() {
			var item=$(this).parent().parent()
			    /*利用jqurey的data-*为每个清单添加index，并获取所点击的清单的index*/
				,index=item.data('index')
				;
			delete_task(index);
		});
	}

	/*
	 *监听查看清单详情事件*/
	function listen_task_detail() {
		var index;
		/*双击单个清单显示清单详情*/
		$('.task-item').on('dblclick', function() {
			index=$(this).data('index');
			task_detial_show(index);
		});
		/*单击详情按钮显示清单详情*/
		$detail_task_trig.on('click', function() {
			var item=$(this).parent().parent();
			index=item.data('index');
			task_detial_show(index);
		});
	}

	/*监听checkbox是否被选中*/
	function listen_check_complete() {
		$check_complete.on('click', function() {
			var $this=$(this);
			var is_complete=$this.is(':checked');
			var index=$this.parent().parent().data('index');
		    /*标记清单完成与未完成状态时，如已经完成，再次点击时，提醒用户更新提醒时间*/
			if (task_list[index].complete) {
					show_notice_msg(task_list[index].content+
						"已经完成，如需再次提醒，请更新提醒时间");	
			}
			/*标记完成后更新task_list*/
			update_task(index,{complete:is_complete});

			/*task_list[index]=$.extend(true, task_list[index], {complete:is_complete});
			store.set('task_list',task_list);*/
		});
	}

	/*
	 *清单详情展示*/
	function task_detial_show(index) {
		render_task_detail(index);
		$detail_task.slideDown(500);
		$detail_task_mask.show();
	}

	/*渲染指定清淡的详情页*/
	function render_task_detail(index) {
		/*如果没有index或者所给index无对应值，则返回*/
		if (index==undefined || !task_list[index]) return;
		/*创建清单详情模板*/
		var tpl='<form>'+
				'<div class="content detial-item">'+(task_list[index].content || "")+'</div>'+
				'<div class="detial-item"><input style="display:none" type="text"'+
		        'name="content" autocomplete="off" value="'+(task_list[index].content || "")+'"></div>'+
        	    
        		'<div class="desc detial-item">'+
				'<textarea  name="desc">'+(task_list[index].desc || "")+'</textarea>'+
        		'</div>'+
        	    '<div class="remind detial-item">'+
        	    '<label>提醒时间</label>'+
        		'<input class="datetime" type="text" name="remind-date" value="'+
        		(task_list[index].remind_date || "")+'"/>'+
        	    '</div>'+
        	    '<div class="detial-item">'+
        		'<button type="submit">更新</button>'+
        	    '</div>'+
        	    '</form>';
        /*清空上一个清单的模板*/
	    $detail_task.html(null);
	    /*添加当前清单模板*/
	    $detail_task.html(tpl);
	    $detail_task_content=$detail_task.find('.content');
	    $detail_task_content_input=$detail_task.find('[name=content]');
	    /*为input引用datetimepicker日期选择控件*/
	    $('.datetime').datetimepicker();

	    /*监听清单详情页的标题栏的双击事件，如果双击，则切换至编辑状态*/
	    $detail_task_content.on('dblclick', function() {
	    	$detail_task_content_input.show();
	    	$detail_task_content.hide();
	    });

	    /*监听清单详情页的提交事件*/
	    $detail_task.find('form').on('submit', function(event) {
	    	event.preventDefault();
	    	/*获取清单详情页的更新后的数据*/
	    	var data={};
	    	data.content=$(this).find('[name=content]').val();
			data.desc=$(this).find('[name=desc]').val();
			data.remind_date=$(this).find('[name=remind-date]').val();
			/*每次更新时设置当前清单的提醒标杆为FALSE*/
			data.comfirmed=false;
			/*更新task_list并隐藏清单详情页*/
	    	update_task(index,data);
	    	task_detial_hide();
	    });
	}

	/*更新单个task数据*/
	function update_task(index,data) {
		task_list[index]=$.extend(true, task_list[index], data);
		refresh_task_list();
	}

	/*
	 *清单详情隐藏*/
	function task_detial_hide() {
		$detail_task.slideUp(500);
		$detail_task_mask.hide();
	}
})(jQuery);