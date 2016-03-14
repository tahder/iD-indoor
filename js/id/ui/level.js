iD.ui.Level = function(context) {
	function lvlUp() {
		d3.event.preventDefault();
		if (!context.inIntro()) context.zoomIn();
	}
	
	function lvlDown() {
		d3.event.preventDefault();
		if (!context.inIntro()) context.zoomOut();
	}
	
	function setLevel(d) {
		console.log(d.value);
	}
	
	function comboValues(d) {
		return {
			value: d,
			title: d.toString()
		};
	}
	
	
	return function(selection) {
		selection.append('button')
			.attr('tabindex', -1)
			.attr('title', t('level.up'))
			.attr('class', 'lvl-up')
			.on('click', lvlUp)
			.call(iD.svg.Icon('#icon-up', 'light'))
			.call(bootstrap.tooltip()
			.placement('left')
			.html(true)
			.title(t('level.up')));
		
		selection.append('input')
			.attr('class', 'value lvl-value')
			.attr('type', 'text')
			.value('')
			.attr('placeholder', '-1')
			.call(d3.combobox().data([ -1, 0, 0.5, 1, 2 ].map(comboValues))
			.on('accept', setLevel));
		
		selection.append('button')
			.attr('tabindex', -1)
			.attr('title', t('zoom.out'))
			.attr('class', 'lvl-down')
			.on('click', lvlDown)
			.call(iD.svg.Icon('#icon-down', 'light'))
			.call(bootstrap.tooltip()
			.placement('left')
			.html(true)
			.title(t('level.down')));
	};
};
