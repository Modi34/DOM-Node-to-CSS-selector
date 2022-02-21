function convertNodeToSelector( node ){
	function scanNode( node ){
		let result = {
			node,
			name: node.nodeName.toLowerCase()
		}

		if(node.id){
			result.id = node.id
		}

		if(node.classList.length > 0){
			result.classList = [ ...node.classList ]
		}

		result.selector = generateLongestSelector( result );
		result.allSelectors = generateAllSelectorVariations( result )

		return result
	}

	function generateAllSelectorVariations( params ){
		let {name, id = '', classList = [], index = ''} = params
		let variations = []
		if(id){
			id = selectorTemplates.id( id )
			variations.push(id)
		}

		variations.push(name)

		if(index){
			index = selectorTemplates.index( index );
		}

		if(classList.length > 0){
			let classVariations = combine( classList ).map(c=>'.'+c.join('.')).sort((a, b) => a.length - b.length);

			let classAndNameVariations = [
					...classVariations, 
					...classVariations.map(str => name + str)
			].sort((a, b) => a.length - b.length);

			variations = [
				...variations, 
				...classAndNameVariations,
				params.selector
			];
		}

		return variations
	}


	function optimizeSelector(params, limit){
		let currentSelector = params.map(param => param.selector)
		for (var key = params.length - 1; key >= 0; key--) {
			let param = params[ key ];
			for(let selector of param.allSelectors){
				let newSelector = generateSelector( 
					currentSelector.map( 
						(str, i) => i == key ? selector : str 
					)
				)

				if(document.querySelectorAll( newSelector ).length == limit){
					currentSelector[ key ] = selector
					break;
				}
			}
		}
		return currentSelector
	}

	function findCommonParents(parent){
		let nodes = []
		let parents = []
		let finalParents = []
		let numberOfMatches = 0;
		let desiredNumberOfMatches = 0;
		while(parent != document){
			let scan = scanNode( parent );
			if(parents.length == 0){
				nodes = [0, ...document.querySelectorAll( scan.selector )]
			}
			parents.push( scan )
			numberOfMatches = nodes.reduce((p, c) => p + (parent.contains(c) ? 1 : 0));
			let check = document.querySelectorAll(generateSelector( parents )).length;
			if(check == numberOfMatches){
				if(check == 1 && parents.length == 1){
					return {path: [scan], target: scan, parents: [], numberOfNodes: 1}
				}
				if(!desiredNumberOfMatches){
					desiredNumberOfMatches = numberOfMatches;
				}
				finalParents = [...parents]
			}
			parent = parent.parentNode;
		}

		let path = [...finalParents]
		let target = finalParents.shift();
		return {path, target, parents: finalParents, numberOfNodes: desiredNumberOfMatches}
	}

	function findBestParentsCombination(commonParents){
		if(!commonParents.parents[0]){
			return [commonParents.target]
		}
		let combinations = combine(commonParents.parents.reverse())
			.sort((a, b) => a.length - b.length)
			.map(c=>({parents: c, selector: generateSelector([...c, commonParents.target].reverse())}))
			.reverse()

		let combo;
		while(combo = combinations.pop()){
			if(document.querySelectorAll( combo.selector ).length == commonParents.numberOfNodes){
				return [commonParents.target, ...combo.parents]
			}
		}
	}

	// utils
	function generateSelector(params, joiner = ' '){
		return params.map(param => param.selector || param).reverse().join(joiner)
	}

	let selectorTemplates = {
		name: str => str,
		id: str => '#' + str,
		classList: str => '.'+ str.join('.'),
		index: int => ':nth-child('+ int +')'
	}

	function generateLongestSelector( params ){
		let result = ''
		for(let type in selectorTemplates){
			if(params[ type ]){
				result += selectorTemplates[ type ]( params[ type ] )
			}
		}

		return result
	}

	// https://github.com/Modi34/Array-combinations
	function combine(arr = []){
		let result = []
		function combine(sub = [], i = 0) {
			let c, v;
			while(v = arr[i++]){
				result.push(c = [...sub, v])
				combine(c, i)
			};
		}; 
		combine();
		return result
	}

	// 
	let commonParents = findCommonParents(node)
	let parentsCombination = findBestParentsCombination( commonParents )

	return generateSelector(optimizeSelector(parentsCombination, commonParents.numberOfNodes));
}
