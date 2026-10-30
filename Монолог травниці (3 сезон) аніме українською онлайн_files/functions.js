// Дерево файлов
function trackerFileTreeToogle(event) {
	var event = event || window.event;
	var folder = event.target || event.srcElement;
	var parent = folder.parentNode;
	if( !$(folder).hasClass('folder') ) return;
	if( $(parent).hasClass('folderOpen') ) {
		$(parent).toggleClass('folderOpen folderClose');
	} else if( $(parent).hasClass('folderClose') ) {
		$(parent).toggleClass('folderClose folderOpen');
	}
}
function trackerAllFolderToogle(event, id) {
	var event = event || window.event;
	var folder = event.target || event.srcElement;
	if( $(folder).hasClass('implode') ) {
		$("#torrentFileList_"+id).find(".folderClose").each(function( index ) {
			$(this).toggleClass('folderClose folderOpen');
		});
		$(folder).toggleClass('implode explode');
	} else if( $(folder).hasClass('explode') ) {
		$("#torrentFileList_"+id).find(".folderOpen").each(function( index ) {
			$(this).toggleClass('folderOpen folderClose');
		});
		$(folder).toggleClass('explode implode');
	}
}

// Обновление информации в новости
function tracker_refresh(fid, nid, act) {
	let name = $('.torrent_title');//Тут наслідив Elfes
	trackerShowLoading(fid);
	$.post(dle_root + "engine/modules/tracker/ajax.php",
		{edit:act, file_id:fid, news_id:nid},
		function(data){
			trackerHideLoading(fid);
			$("#torrent_"+fid+"_"+act).fadeOut(100, function() {
				$(this).html(data);
				$(this).fadeIn(300);
				for(let i = 0, n = name.length; i < n; i++)//І тут наслідив Elfes
				{
					$('.torrent_title')[i].innerText = name[i].innerText;
				}
			});
		}
	);
}

// Удалить
function tracker_delete(fid, nid, fake) {
	DLEconfirm('Удалить данный файл?', 'Удаление файла.',
		function(){
			trackerShowLoading(fid);
			$.post(dle_root + "engine/modules/tracker/ajax.php",
				{edit:'del', file_id:fid, fake:fake},
				function(data){
					trackerHideLoading(fid);
					$("#torrent_"+fid+"_info").after(data).remove();
				}
			);
		}
	);
}

// Проверить
function tracker_check(fid, nid, act) {
	trackerShowLoading(fid);
	$.post(dle_root + "engine/modules/tracker/ajax.php",
		{edit:act, file_id:fid, news_id:nid},
		function(data){
			trackerHideLoading(fid);
			if(act=="multitrackerCacheRenewAJAX" && data=="none") return;
			tracker_refresh(fid, nid, "info");
		}
	);
}

// Редактировать
function torrent_editor(fid) {
	$('#torrentEditor').remove();
	$.post(dle_root + "engine/modules/tracker/ajax.php",
		{edit:'editor', file_id:fid},
		function(data){
			$('body').prepend("<div id=\"torrentEditor\" style=\"display:none;\"></div>");
			$('#torrentEditor').html(data);
			$('#torrentEditor').dialog({
				zIndex: 600,
				width: 580,
				buttons: {
					"Закрыть": function() {
						$(this).dialog('close');
					},
					"Отредактировать" : function() {
						torrent_editor_save(fid);
					},
				},
				title: "Редактирование Torrent-файла",
			});
		}
	);
}
function torrent_editor_save(fid) {
	$.post(dle_root + "engine/modules/tracker/ajax.php",
		$("#torrentEditorForm").serialize()+"&edit=editor_save&file_id="+fid,
		function(data){
			if(data=="ok") {
				$('#torrentEditor').dialog('close');
				tracker_refresh(fid, 0, "info");
			} else {
				$('#torrentEditor').html(data);
			}
		}
	);
}

// AJAX Loading
function trackerShowLoading(fid) {
	$('#torrent_'+fid+'_info').prepend('<div id="torrent_'+fid+'_loader" class="trackerShowLoading"></div>');
}
function trackerHideLoading(fid) {
	$('#torrent_'+fid+'_loader').remove();
}