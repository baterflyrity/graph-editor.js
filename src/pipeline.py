
class Pipe:


	def __init__(self, *processor_functions):
		self._processors = []
		for p in processor_functions:
			self.chain(p)

	def chain(self, processor_function):
		self._processors.append(processor_function)

	def _flat_list(self, lst):
		return [item for sublist in lst if isinstance(sublist, list) for item in sublist]

	def _parse_results(self, results):
		data = []
		for res in results:
			if isinstance(res, Multidata):
				for d in res:
					data.append(d)
			else:
				data.append(res)
		return data

	def run(self):
		data = [None]
		for p in self._processors:
			if isinstance(p, Socket):
				data = self._parse_results([p(data)])
			else:
				data = self._parse_results([p(x) for x in data])


class ParametrizedProcessor:
	_previous = None
	_next = None

	def __or__(self, other):
		if not isinstance(other, ParametrizedProcessor):
			raise ValueError('Can only chain processors.')
		self._next = other
		other._previous = self
		return other

	def __gt__(self, other):
		if not isinstance(other, ParametrizedProcessor):
			raise ValueError('Can only merge into processors.')
		socket = MergeProcessor()
		self._next = socket
		socket._previous = self
		chain = other._get_chain()
		socket._next = chain[0]
		chain[0]._previous = socket
		return chain[-1]

	def _get_chain(self):
		chain = [self]
		previous = self._previous
		while previous is not None:
			chain.append(previous)
			previous = previous._previous
		chain = chain[::-1]
		next = self._next
		while next is not None:
			chain.append(next)
			next = next._next
		return chain

	def run(self):
		return Pipe(*self._get_chain()).run()

	def _run(self, data):
		raise NotImplemented()

	def __call__(self, *args, **kwargs):
		return self._run(args[0])


def Processor(foo):
	class wrapper(ParametrizedProcessor):


		def _run(self, data):
			return foo(data)

	return wrapper


class Generator(ParametrizedProcessor):


	def __call__(self, *args, **kwargs):
		return Multidata(*super().__call__(*args, **kwargs))


class Socket(ParametrizedProcessor):
	pass


class MergeProcessor(Socket):


	def _run(self, data):
		if len(data) == 0:
			return None
		if isinstance(data[0], str):
			return ''.join(data)
		elif isinstance(data[0], bytes):
			return b''.join(data)
		return data


class Multidata(list):


	def __init__(self, *data):
		super().__init__(data)
