import { Icon } from '../svg/index';

export function Level(context) {
	function lvlUp() {
		d3.event.preventDefault();
		if (!context.inIntro()) context.levelUp();
	}
	
	function lvlDown() {
		d3.event.preventDefault();
		if (!context.inIntro()) context.levelDown();
	}
	
	function setLevel(d) {
		d3.event.preventDefault();
		if (!context.inIntro()) context.setLevel(d.value);
	}
	
	function comboValues(d) {
		return {
			value: d,
			title: d.toString()
		};
	}
	
	function updateCombo() {
		d3.select('input.lvl-value')
			.attr('placeholder', context.level)
			.property('value', '')
			.call(d3.combobox(true).data(context.availableLevels().map(comboValues))
			.on('accept', setLevel));
	}
	
	return function(selection) {
		selection.append('button')
			.attr('tabindex', -1)
			.attr('title', t('level.up'))
			.attr('class', 'lvl-up')
			.on('click', lvlUp)
			.call(Icon('#icon-up', 'light'))
			.call(bootstrap.tooltip()
			.placement('left')
			.html(true)
			.title(t('level.up')));
		
		selection.append('input')
			.attr('class', 'value lvl-value')
			.attr('type', 'text')
			.value('')
			.attr('placeholder', context.level)
			.call(d3.combobox(true).data(context.availableLevels().map(comboValues))
			.on('accept', context.setLevel));
		
		selection.append('button')
			.attr('tabindex', -1)
			.attr('title', t('zoom.out'))
			.attr('class', 'lvl-down')
			.on('click', lvlDown)
			.call(Icon('#icon-down', 'light'))
			.call(bootstrap.tooltip()
			.placement('left')
			.html(true)
			.title(t('level.down')));

		context.map().on('drawn', function() {
			context.updateAvailableLevels();
			updateCombo();
		});
		
		context.on('levelchange', function() {
			updateCombo();
		});
	};
};
